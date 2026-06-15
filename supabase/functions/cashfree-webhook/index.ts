import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { fetchCashfreeOrder } from "../_shared/cashfree.ts";
import { sendEmail, orderConfirmationHtml } from "../_shared/email.ts";

const CASHFREE_SECRET_KEY = Deno.env.get("CASHFREE_SECRET_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
// Optional dedicated webhook secret; falls back to the API secret key.
const WEBHOOK_SECRET =
  Deno.env.get("CASHFREE_WEBHOOK_SECRET") || CASHFREE_SECRET_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Constant-time string comparison to avoid timing attacks.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function verifySignature(
  timestamp: string,
  rawBody: string,
  signature: string,
): boolean {
  if (!signature || !timestamp) return false;
  const hmac = createHmac("sha256", WEBHOOK_SECRET);
  hmac.update(timestamp + rawBody);
  const expected = hmac.digest("base64");
  return safeEqual(signature, expected);
}

// Record the event for replay protection / auditing. Returns false if it was
// already processed (duplicate delivery).
async function recordEvent(
  externalId: string,
  signature: string,
  raw: unknown,
): Promise<boolean> {
  const { data: existing } = await supabase
    .from("webhook_events")
    .select("id, processed_at")
    .eq("provider", "cashfree")
    .eq("external_event_id", externalId)
    .maybeSingle();

  if (existing?.processed_at) return false; // already fully handled

  if (!existing) {
    await supabase
      .from("webhook_events")
      .insert([
        {
          provider: "cashfree",
          external_event_id: externalId,
          signature,
          payload: raw,
        },
      ])
      .catch(() => {});
  }
  return true;
}

async function markProcessed(externalId: string, error?: string) {
  await supabase
    .from("webhook_events")
    .update({
      processed_at: new Date().toISOString(),
      processing_error: error ?? null,
    })
    .eq("provider", "cashfree")
    .eq("external_event_id", externalId)
    .catch(() => {});
}

serve(async (req: Request) => {
  // Cashfree only ever POSTs JSON webhooks.
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("x-webhook-signature") || "";
  const timestamp = req.headers.get("x-webhook-timestamp") || "";
  const rawBody = await req.text();

  // 1. Verify the HMAC signature on the RAW body.
  if (!verifySignature(timestamp, rawBody, signature)) {
    console.error("Cashfree webhook: invalid signature");
    return new Response("Invalid signature", { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const type: string = event?.type || "UNKNOWN";
  const order = event?.data?.order || {};
  const payment = event?.data?.payment || {};
  const refund = event?.data?.refund || {};
  const dispute = event?.data?.dispute || {};
  // Order id can live under order / refund / dispute depending on the event.
  const dbOrderId: string | undefined =
    order.order_id || refund.order_id || dispute.order_id;

  // Build a stable, event-specific dedupe key for replay protection.
  let externalId: string;
  if (type.startsWith("REFUND")) {
    externalId = `refund:${refund.cf_refund_id || refund.refund_id || dbOrderId}:${type}`;
  } else if (type.startsWith("DISPUTE")) {
    externalId = `dispute:${dispute.dispute_id || dispute.cf_dispute_id || dbOrderId}:${type}`;
  } else {
    const cfPaymentId: string =
      payment.cf_payment_id?.toString() || `${dbOrderId}:${type}`;
    externalId = `${cfPaymentId}:${type}`;
  }

  try {
    if (!dbOrderId) {
      // Nothing actionable; acknowledge so Cashfree stops retrying.
      return new Response("No order id", { status: 200 });
    }

    // 2. Replay protection.
    const fresh = await recordEvent(externalId, signature, event);
    if (!fresh) {
      return new Response("Duplicate event ignored", { status: 200 });
    }

    if (type === "PAYMENT_SUCCESS_WEBHOOK") {
      // 3. Defense-in-depth: re-verify against Cashfree's order-status API
      //    before trusting the "paid" signal.
      let confirmed = true;
      try {
        const cfOrder = await fetchCashfreeOrder(dbOrderId);
        confirmed = (cfOrder?.order_status || "").toUpperCase() === "PAID";
      } catch (e) {
        // If the lookup fails we still proceed (signature already verified),
        // but we note it for auditing.
        console.warn(
          "Cashfree re-verify failed, trusting signed payload:",
          (e as Error).message,
        );
      }

      if (!confirmed) {
        await markProcessed(externalId, "order not PAID on re-verify");
        return new Response("Order not paid on re-verify", { status: 200 });
      }

      // 4. Atomic, idempotent money path in the DB.
      const { data, error } = await supabase.rpc("mark_order_paid", {
        p_order_id: dbOrderId,
        p_cf_payment_id: payment.cf_payment_id?.toString() || null,
        p_cf_signature: signature,
        p_payment_method:
          payment.payment_group || payment.payment_method || null,
        p_amount: payment.payment_amount
          ? Math.round(payment.payment_amount * 100)
          : null,
        p_raw: event,
      });
      if (error) throw error;

      await markProcessed(externalId);
      console.log(`Order ${dbOrderId} marked paid:`, data);

      // 4b. Clear the user's cart so it doesn't restore if they drop off before redirect
      try {
        const { data: ordInfo } = await supabase
          .from("orders")
          .select("user_id")
          .eq("id", dbOrderId)
          .maybeSingle();
        
        if (ordInfo?.user_id) {
          await supabase
            .from("cart_sessions")
            .delete()
            .eq("user_id", ordInfo.user_id);
          console.log(`Cleared cart for user ${ordInfo.user_id}`);
        }
      } catch (e) {
        console.warn("Failed to clear cart session:", (e as Error).message);
      }

      // 5a. Send the order confirmation email (best-effort; never blocks the webhook).
      try {
        const { data: ord } = await supabase
          .from("orders")
          .select("order_number, total_amount, subtotal, discount_amount, shipping_fee, customer_email, payment_method, shipping_address_snapshot, customer_phone")
          .eq("id", dbOrderId)
          .maybeSingle();
        if (ord?.customer_email) {
          const { data: orderItems } = await supabase
            .from("order_items")
            .select("product_name, product_image, size, color, quantity, price_at_purchase")
            .eq("order_id", dbOrderId);
          const escHtml = (s: string) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          let shippingAddressHtml = "";
          const snap = ord.shipping_address_snapshot;
          if (snap) {
            shippingAddressHtml = `${escHtml(snap.line1)}${snap.line2 ? '<br>'+escHtml(snap.line2) : ''}<br>${escHtml(snap.city)}, ${escHtml(snap.state)} ${escHtml(snap.postal_code)}`;
          }

          await sendEmail({
            to: ord.customer_email,
            subject: `Order confirmed — ${ord.order_number}`,
            html: orderConfirmationHtml(
              {
                order_number: ord.order_number,
                total_amount: ord.total_amount,
                subtotal: ord.subtotal,
                discount_amount: ord.discount_amount,
                shipping_fee: ord.shipping_fee,
                customer_email: ord.customer_email,
                payment_method: ord.payment_method,
                shipping_address_html: shippingAddressHtml,
                customer_phone: ord.customer_phone || null,
              },
              orderItems || [],
            ),
          });
        }
      } catch (e) {
        console.warn("Order confirmation email failed:", (e as Error).message);
      }
    } else if (
      type === "PAYMENT_FAILED_WEBHOOK" ||
      type === "PAYMENT_USER_DROPPED_WEBHOOK"
    ) {
      const { error } = await supabase.rpc("mark_order_failed", {
        p_order_id: dbOrderId,
        p_reason: payment.payment_message || type,
        p_cf_payment_id: payment.cf_payment_id?.toString() || null,
        p_raw: event,
      });
      if (error) throw error;
      await markProcessed(externalId);
    } else if (type.startsWith("REFUND")) {
      // Refund completed at Cashfree -> mark refunded + restock (full refund).
      const refundStatus = String(refund.refund_status || "").toUpperCase();
      if (refundStatus === "SUCCESS") {
        const { error } = await supabase.rpc("mark_order_refunded", {
          p_order_id: dbOrderId,
          p_refund_amount: refund.refund_amount
            ? Math.round(refund.refund_amount * 100)
            : null,
          p_cf_refund_id:
            (refund.cf_refund_id || refund.refund_id || "").toString() || null,
          p_raw: event,
        });
        if (error) throw error;
        await markProcessed(externalId);
      } else {
        // PENDING / FAILED / CANCELLED refund — recorded, no money move yet.
        await markProcessed(
          externalId,
          `refund status: ${refundStatus || "unknown"}`,
        );
      }
    } else if (type.startsWith("DISPUTE")) {
      // Chargeback / dispute lifecycle event -> flag the order for review.
      const { error } = await supabase.rpc("mark_order_disputed", {
        p_order_id: dbOrderId,
        p_dispute_id:
          (dispute.dispute_id || dispute.cf_dispute_id || "").toString() ||
          null,
        p_dispute_status:
          dispute.dispute_status || dispute.reason_description || type,
        p_raw: event,
      });
      if (error) throw error;
      await markProcessed(externalId);
    } else {
      // Truly unhandled event type — stored for audit, acknowledged.
      await markProcessed(externalId, `unhandled type: ${type}`);
    }

    // 5. Always 200 once recorded, so Cashfree stops retrying.
    return new Response("Webhook processed", { status: 200 });
  } catch (err) {
    console.error("Webhook processing error:", err);
    // Record the error but still 200 so the event is not retried forever;
    // it is safely stored in webhook_events for manual replay if needed.
    await markProcessed(externalId, (err as Error).message);
    return new Response("Recorded with error", { status: 200 });
  }
});
