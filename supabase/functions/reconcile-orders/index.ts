import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { fetchCashfreeOrder } from "../_shared/cashfree.ts";
import { sendEmail, orderConfirmationHtml } from "../_shared/email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ORDER_EMAIL_SECRET = Deno.env.get("ORDER_EMAIL_SECRET") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Order statuses that are already final — never reconcile these.
const FINAL = [
  "paid",
  "completed",
  "success",
  "confirmed",
  "shipped",
  "delivered",
  "fulfilled",
  "failed",
  "cancelled",
  "canceled",
  "refunded",
];

// Safety net for missed/late webhooks.
//
// An order is created `pending` and only flips to `paid` when Cashfree's
// webhook reaches us. If the shopper closes the tab, or the webhook is delayed,
// dropped, or arrives while the function is down, a *paid* order can stay
// `pending` forever. This job runs on a cron (pg_cron -> net.http_post, see
// SETUP.md), re-asks Cashfree for the authoritative status of each stale
// pending order, and finalizes it exactly like the webhook would have.
//
// Everything here is idempotent: mark_order_paid / mark_order_failed no-op if
// the order is already in that state.
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Shared-secret auth (same secret as the other internal cron functions).
  if (
    ORDER_EMAIL_SECRET &&
    req.headers.get("x-pc-secret") !== ORDER_EMAIL_SECRET
  ) {
    return errorResponse("Unauthorized", 401, "unauthorized");
  }

  // Reconcile orders created between 3 days and 15 minutes ago. The lower
  // bound gives the normal webhook time to arrive; the upper bound avoids
  // hammering Cashfree for ancient abandoned orders.
  const minAge = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const maxAge = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const result = {
    checked: 0,
    paid: 0,
    failed: 0,
    stillPending: 0,
    errors: 0,
  };

  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select(
        "id, order_number, status, total_amount, customer_email, payment_method, created_at",
      )
      .lt("created_at", minAge)
      .gt("created_at", maxAge)
      .limit(100);
    if (error) throw error;

    for (const o of orders || []) {
      const status = String(o.status || "").toLowerCase();
      // Skip COD (no gateway payment) and anything already final.
      if (o.payment_method === "cod") continue;
      if (FINAL.includes(status)) continue;

      result.checked++;
      try {
        const cf = await fetchCashfreeOrder(o.id);
        const cfStatus = String(cf?.order_status || "").toUpperCase();

        if (cfStatus === "PAID") {
          const { error: rpcErr } = await supabase.rpc("mark_order_paid", {
            p_order_id: o.id,
            p_cf_payment_id: null,
            p_cf_signature: "reconcile",
            p_payment_method: null,
            p_amount: cf?.order_amount
              ? Math.round(cf.order_amount * 100)
              : null,
            p_raw: cf,
          });
          if (rpcErr) throw rpcErr;
          result.paid++;

          // Send the confirmation email the missed webhook would have sent.
          try {
            if (o.customer_email) {
              const { data: ord } = await supabase
                .from("orders")
                .select(
                  "order_number, total_amount, shipping_fee, customer_email",
                )
                .eq("id", o.id)
                .maybeSingle();
              const { data: items } = await supabase
                .from("order_items")
                .select(
                  "product_name, size, color, quantity, price_at_purchase",
                )
                .eq("order_id", o.id);
              if (ord?.customer_email) {
                await sendEmail({
                  to: ord.customer_email,
                  subject: `Your PANTHERCLAW order ${ord.order_number || ""} is confirmed`,
                  html: orderConfirmationHtml(ord, items || []),
                });
              }
            }
          } catch (e) {
            console.warn(
              "reconcile: confirmation email failed:",
              (e as Error).message,
            );
          }
        } else if (
          cfStatus === "EXPIRED" ||
          cfStatus === "TERMINATED" ||
          cfStatus === "TERMINATION_REQUESTED" ||
          cfStatus === "FAILED"
        ) {
          const { error: rpcErr } = await supabase.rpc("mark_order_failed", {
            p_order_id: o.id,
            p_reason: `Reconcile: gateway ${cfStatus}`,
            p_cf_payment_id: null,
            p_raw: cf,
          });
          if (rpcErr) throw rpcErr;
          result.failed++;
        } else {
          // Still ACTIVE at Cashfree — payment genuinely not completed yet.
          result.stillPending++;
        }
      } catch (e) {
        result.errors++;
        console.warn("reconcile: error for order", o.id, (e as Error).message);
      }
    }

    return jsonResponse({ ok: true, ...result });
  } catch (err) {
    console.error("reconcile-orders failed:", err);
    return errorResponse((err as Error).message, 500, "reconcile_failed");
  }
});
