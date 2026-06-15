import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import {
  CASHFREE_BASE_URL,
  cashfreeHeaders,
  fetchCashfreeOrder,
} from "../_shared/cashfree.ts";
import { sendEmail, orderConfirmationHtml } from "../_shared/email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Shipping rule (kept in sync with the storefront):
//  - Express is always the express flat rate.
//  - Standard is FREE on orders of 2+ items, otherwise the flat rate.
const COD_FEE = 5000; // ₹50 in paise
function computeShipping(
  config: any,
  method: string,
  totalQty: number,
): number {
  const flat = config?.flat_rate ?? 10000;
  const express = config?.express_rate ?? 20000;
  if (method === "express") return express;
  return totalQty >= 2 ? 0 : flat;
}

// Validate the caller's Supabase access token (if any) and return the
// authenticated user id. supabase-js sends the anon key as the bearer for
// logged-out callers, which resolves to no user here -> treated as guest.
async function getAuthedUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

// Resume an existing order found by its idempotency key. Returns a ready-to-send
// Response when the order is already paid, is a confirmed COD order, or still has
// a live Cashfree payment session. Returns null when the order is dead/stale and
// should be superseded by a fresh attempt.
async function tryResumeExistingOrder(existing: any): Promise<Response | null> {
  if (!existing) return null;
  const status = (existing.status || "").toString().toLowerCase();
  const dead = ["failed", "cancelled", "canceled", "payment_failed"];
  const settled = [
    "paid",
    "completed",
    "success",
    "confirmed",
    "shipped",
    "delivered",
    "fulfilled",
  ];

  // Terminally failed/cancelled orders can never be resumed — supersede them.
  if (dead.includes(status)) return null;

  // Confirmed COD order — nothing left to pay.
  if (existing.payment_method === "cod") {
    return jsonResponse({
      cod: true,
      order_id: existing.id,
      order_number: existing.order_number,
      amount: existing.total_amount,
      idempotent: true,
    });
  }

  // Already settled prepaid order (defensive; also re-checked at the gateway).
  if (settled.includes(status)) {
    return jsonResponse({
      paid: true,
      order_id: existing.id,
      order_number: existing.order_number,
      amount: existing.total_amount,
      idempotent: true,
    });
  }

  // Pending prepaid order: ask Cashfree if it's paid or still resumable.
  try {
    const cfOrder = await fetchCashfreeOrder(existing.id);
    const cfStatus = (cfOrder?.order_status || "").toUpperCase();
    if (cfStatus === "PAID") {
      return jsonResponse({
        paid: true,
        order_id: existing.id,
        order_number: existing.order_number,
        amount: existing.total_amount,
        idempotent: true,
      });
    }
    if (cfStatus === "ACTIVE" && cfOrder?.payment_session_id) {
      return jsonResponse({
        payment_session_id: cfOrder.payment_session_id,
        order_id: existing.id,
        order_number: existing.order_number,
        amount: existing.total_amount,
        idempotent: true,
      });
    }
  } catch (_) {
    // No live Cashfree order (never created / expired) — fall through to supersede.
  }
  return null;
}

// Free a stale order so a brand-new attempt can reuse its cart's idempotency key:
// release any inventory it was holding and swap its idempotency key for a unique,
// non-null sentinel (satisfies every unique constraint without blocking the retry).
async function supersedeStaleOrder(id: string): Promise<void> {
  await supabase.rpc("release_order_inventory", { p_order_id: id }).then(
    () => {},
    () => {},
  );
  await supabase
    .from("orders")
    .update({ idempotency_key: `void_${id}_${Date.now()}` })
    .eq("id", id);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { customerPhone, customerEmail, orderMeta, cartItems } = body;
    const action = body.action;
    const paymentMethod = body.paymentMethod === "cod" ? "cod" : "prepaid";

    // SECURITY: never trust a client-supplied user id. Identity comes only
    // from the verified JWT; an absent/invalid token means guest checkout.
    const authedUserId = await getAuthedUserId(req);
    const isGuestOrder = !authedUserId;
    const trustedUserId = authedUserId;

    // Lightweight status check used by the success page (works for guests too,
    // since this runs with the service role). Returns the authoritative order.
    if (action === "verify-order") {
      const orderId = body.orderId || body.order_id;
      if (!orderId)
        return errorResponse("Missing order id", 400, "missing_order");
      const { data: ord, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, status, total_amount, subtotal, shipping_fee, discount_applied, currency, created_at, customer_email, order_items(product_name, product_image, size, color, quantity, price_at_purchase)",
        )
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      if (!ord) return errorResponse("Order not found", 404, "not_found");
      return jsonResponse({ order: ord });
    }

    if (action !== "create-order") {
      return errorResponse(`Unknown action: ${action}`, 400, "unknown_action");
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return errorResponse("Your cart is empty.", 400, "empty_cart");
    }

    const totalQty = cartItems.reduce(
      (s: number, i: any) => s + (Number(i.qty) || 1),
      0,
    );
    if (totalQty > 20) {
      return errorResponse(
        "Orders are limited to 20 items. Please reduce your bag.",
        400,
        "max_quantity",
      );
    }

    // -----------------------------------------------------------------
    // 0. Idempotency. The client sends a deterministic key derived from the
    //    cart; an identical retry (double-click, refresh, flaky network)
    //    must RESUME the existing order, never create a second one (which
    //    would double-charge and double-reserve stock).
    // -----------------------------------------------------------------
    const idempotencyKey = orderMeta?.idempotency_key || crypto.randomUUID();
    {
      const { data: dupe } = await supabase
        .from("orders")
        .select("id, order_number, status, total_amount, payment_method")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (dupe) {
        const resumed = await tryResumeExistingOrder(dupe);
        if (resumed) return resumed;
        // A stale/abandoned order is squatting on this cart's idempotency key.
        // Free it (release held stock + detach the key) so the fresh order
        // below can be created instead of colliding on the unique constraint.
        await supersedeStaleOrder(dupe.id);
      }
    }

    // -----------------------------------------------------------------
    // 1. Recompute the subtotal from authoritative DB prices.
    //    Never trust client-supplied amounts.
    // -----------------------------------------------------------------
    const variantIds = cartItems.map((i: any) => i.variant_id).filter(Boolean);
    let priceByVariant: Record<string, number> = {};
    let mrpByVariant: Record<string, number> = {};
    let weightByVariant: Record<string, number> = {};

    if (variantIds.length > 0) {
      const { data: variants, error: vErr } = await supabase
        .from("product_variants")
        .select("id, weight_grams, is_active, products(price, mrp)")
        .in("id", variantIds);
      if (vErr) throw vErr;
      for (const v of variants || []) {
        // Only honour active variants as a trusted price source.
        if ((v as any).is_active === false) continue;
        priceByVariant[v.id] = (v as any).products?.price ?? null;
        mrpByVariant[v.id] = (v as any).products?.mrp ?? null;
        weightByVariant[v.id] = (v as any).weight_grams ?? 0;
      }
    }

    // SECURITY: if a line references a variant we cannot resolve to an active
    // DB price, reject the whole order rather than trusting the client price.
    for (const item of cartItems) {
      if (
        item.variant_id &&
        typeof priceByVariant[item.variant_id] !== "number"
      ) {
        return errorResponse(
          "One or more items are no longer available. Please refresh your bag.",
          409,
          "invalid_item",
        );
      }
    }

    let subtotal = 0;
    let totalWeight = 0;
    for (const item of cartItems) {
      const qty = Number(item.qty) || 1;
      const trusted = item.variant_id ? priceByVariant[item.variant_id] : null;
      // Fall back to the client price only when there is genuinely no variant.
      const unit =
        typeof trusted === "number" ? trusted : Number(item.price) || 0;
      subtotal += unit * qty;
      totalWeight +=
        (item.variant_id ? weightByVariant[item.variant_id] || 0 : 0) * qty;
    }

    // -----------------------------------------------------------------
    // 2. Re-validate the discount code server-side.
    // -----------------------------------------------------------------
    let discountAmount = 0;
    let discountCodeId: string | null = null;

    if (orderMeta?.discount_id) {
      const { data: dc } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("id", orderMeta.discount_id)
        .eq("is_active", true)
        .maybeSingle();

      if (dc) {
        const now = new Date();
        let ok =
          (!dc.starts_at || new Date(dc.starts_at) <= now) &&
          (!dc.expires_at || new Date(dc.expires_at) >= now) &&
          (!dc.max_uses || dc.used_count < dc.max_uses) &&
          (!dc.min_order_value || subtotal >= dc.min_order_value);

        // Enforce the per-user usage cap server-side.
        if (ok && dc.per_user_limit) {
          let usedByUser = 0;
          if (trustedUserId) {
            const { count } = await supabase
              .from("discount_usages")
              .select("id", { count: "exact", head: true })
              .eq("discount_id", dc.id)
              .eq("user_id", trustedUserId);
            usedByUser = count || 0;
          } else if (customerEmail) {
            const { count } = await supabase
              .from("discount_usages")
              .select("id", { count: "exact", head: true })
              .eq("discount_id", dc.id)
              .eq("guest_email", customerEmail);
            usedByUser = count || 0;
          }
          if (usedByUser >= dc.per_user_limit) ok = false;
        }

        if (ok) {
          discountCodeId = dc.id;
          if (dc.discount_type === "fixed") discountAmount = dc.discount_value;
          else if (dc.discount_type === "percentage")
            discountAmount = Math.floor((subtotal * dc.discount_value) / 100);
          discountAmount = Math.min(discountAmount, subtotal);
        }
      }
    }

    // -----------------------------------------------------------------
    // 3. Shipping + final total, computed on the server.
    // -----------------------------------------------------------------
    const { data: shippingConfig } = await supabase
      .from("shipping_config")
      .select("*")
      .limit(1)
      .maybeSingle();

    const shippingMethod =
      orderMeta?.shipping_method === "express" ? "express" : "standard";
    const shippingFee = computeShipping(
      shippingConfig,
      shippingMethod,
      totalQty,
    );
    const codFee = paymentMethod === "cod" ? COD_FEE : 0;
    const taxAmount = 0; // Not GST-registered — prices are all-inclusive. See SETUP.
    const totalAmount = Math.max(
      0,
      subtotal - discountAmount + shippingFee + taxAmount + codFee,
    );

    // -----------------------------------------------------------------
    // 4. Guest address (service role bypasses RLS). Logged-in users pass
    //    an existing address_id.
    // -----------------------------------------------------------------
    let finalAddressId = orderMeta?.address_id || null;
    const guestAddress = orderMeta?.guest_address || null;

    // SECURITY: a logged-in user may only ship to an address they own.
    if (!isGuestOrder && finalAddressId) {
      const { data: ownAddr } = await supabase
        .from("addresses")
        .select("id")
        .eq("id", finalAddressId)
        .eq("user_id", trustedUserId)
        .maybeSingle();
      if (!ownAddr) {
        return errorResponse(
          "That shipping address could not be verified.",
          403,
          "invalid_address",
        );
      }
    }

    if (!isGuestOrder && !finalAddressId && guestAddress) {
      // Logged-in user typed a fresh address — persist it to their account.
      const { data: newAddr, error: addrError } = await supabase
        .from("addresses")
        .insert([
          {
            user_id: trustedUserId,
            label: guestAddress.label || "Shipping",
            address_line_1: guestAddress.line1,
            address_line_2: guestAddress.line2 || null,
            city: guestAddress.city,
            state: guestAddress.state,
            postal_code: guestAddress.postalCode,
            country: "IN",
            is_default: false,
          },
        ])
        .select("id")
        .single();
      if (addrError) throw addrError;
      finalAddressId = newAddr.id;
    }

    // -----------------------------------------------------------------
    // 5. Create the order (status pending). Order number is set by trigger.
    // -----------------------------------------------------------------
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert([
        {
          user_id: isGuestOrder ? null : trustedUserId,
          status: "pending",
          is_guest: isGuestOrder,
          subtotal,
          total_amount: totalAmount,
          tax_amount: taxAmount,
          currency: "INR",
          payment_method: paymentMethod,
          cod_fee: codFee,
          total_weight_grams: totalWeight,
          shipping_method: shippingMethod,
          shipping_fee: shippingFee,
          discount_code_id: discountCodeId,
          discount_applied: discountAmount,
          shipping_address_id: isGuestOrder ? null : finalAddressId,
          shipping_address_snapshot: guestAddress
            ? {
                line1: guestAddress.line1,
                line2: guestAddress.line2 || null,
                city: guestAddress.city,
                state: guestAddress.state,
                postal_code: guestAddress.postalCode,
                country: "IN",
              }
            : null,
          customer_email: customerEmail || null,
          customer_phone: customerPhone || null,
          idempotency_key: idempotencyKey,
        },
      ])
      .select("id, order_number")
      .single();

    if (orderError) {
      // 23505 = unique violation on the idempotency key. A concurrent request
      // beat us to it. Resume that order if it is payable; otherwise rethrow a
      // retryable error — the next attempt's pre-insert check supersedes the
      // stale row and succeeds.
      if ((orderError as any).code === "23505") {
        const { data: existing } = await supabase
          .from("orders")
          .select("id, order_number, status, total_amount, payment_method")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();
        const resumed = await tryResumeExistingOrder(existing);
        if (resumed) return resumed;
      }
      throw orderError;
    }
    const dbOrderId = orderData.id;

    // -----------------------------------------------------------------
    // 6. Snapshot order items.
    // -----------------------------------------------------------------
    const itemsToInsert = cartItems.map((item: any) => {
      const trusted = item.variant_id ? priceByVariant[item.variant_id] : null;
      const unit =
        typeof trusted === "number" ? trusted : Number(item.price) || 0;
      const qty = Number(item.qty) || 1;
      const mrp = item.variant_id ? mrpByVariant[item.variant_id] : null;
      const unitMrp = typeof mrp === "number" && mrp > unit ? mrp : null;
      const lineDiscount = unitMrp ? (unitMrp - unit) * qty : 0;
      return {
        order_id: dbOrderId,
        variant_id: item.variant_id || null,
        product_name: item.name,
        product_image: item.image || null,
        size: item.size,
        color: item.color || null,
        color_hex: item.color_hex || null,
        sku: item.sku || null,
        quantity: qty,
        price_at_purchase: unit,
        unit_mrp: unitMrp,
        line_discount: lineDiscount,
        currency: "INR",
      };
    });

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(itemsToInsert);
    if (itemsError) throw itemsError;

    // -----------------------------------------------------------------
    // 6b. Reserve inventory atomically so two shoppers cannot buy the
    //     last unit at the same time. Auto-released on failure/timeout.
    // -----------------------------------------------------------------
    const { data: reserveRes, error: reserveErr } = await supabase.rpc(
      "reserve_order_inventory",
      { p_order_id: dbOrderId },
    );
    if (reserveErr) throw reserveErr;
    if (!reserveRes?.ok) {
      await supabase
        .rpc("mark_order_failed", {
          p_order_id: dbOrderId,
          p_reason: "Insufficient stock at checkout",
        })
        .then(
          () => {},
          () => {},
        );
      return errorResponse(
        "Sorry — one or more items just sold out. Please review your bag and try again.",
        409,
        "insufficient_stock",
      );
    }

    // -----------------------------------------------------------------
    // 6c. Cash on Delivery — no payment gateway. Confirm the order now,
    //     finalize inventory, email the confirmation, and return.
    // -----------------------------------------------------------------
    if (paymentMethod === "cod") {
      const { error: codErr } = await supabase.rpc("place_cod_order", {
        p_order_id: dbOrderId,
      });
      if (codErr) {
        await supabase
          .rpc("mark_order_failed", {
            p_order_id: dbOrderId,
            p_reason: "COD confirmation failed",
          })
          .then(
          () => {},
          () => {},
        );
        throw codErr;
      }

      // Explicitly set status to confirmed (in case place_cod_order set it to paid)
      await supabase.from("orders").update({ status: "confirmed" }).eq("id", dbOrderId);

      // Order confirmation email (best effort — never blocks the response).
      try {
        if (customerEmail) {
          await sendEmail({
            to: customerEmail,
            subject: `Order confirmed — ${orderData.order_number}`,
            html: orderConfirmationHtml(
              {
                order_number: orderData.order_number,
                total_amount: totalAmount,
                shipping_fee: shippingFee,
                customer_email: customerEmail,
                payment_method: paymentMethod,
              },
              itemsToInsert,
            ),
          });
        }
      } catch (e) {
        console.error("COD confirmation email failed:", (e as Error).message);
      }

      return jsonResponse({
        cod: true,
        order_id: dbOrderId,
        order_number: orderData.order_number,
        amount: totalAmount,
      });
    }

    // Persist the Cashfree order id (same as our UUID) for traceability.
    await supabase
      .from("orders")
      .update({ cashfree_order_id: dbOrderId })
      .eq("id", dbOrderId);

    // -----------------------------------------------------------------
    // 7. Create the Cashfree payment session.
    // -----------------------------------------------------------------
    const originHeader = req.headers.get("origin") || "https://pantherclaw.in";
    const origin = (CASHFREE_ENV === "production" && originHeader.startsWith("http://"))
      ? "https://pantherclaw.in"
      : originHeader;
    const cfRes = await fetch(`${CASHFREE_BASE_URL}/orders`, {
      method: "POST",
      // Gateway-level idempotency: Cashfree de-dupes order creation on this key,
      // so a retry for the same DB order never creates two payment sessions.
      headers: { ...cashfreeHeaders(), "x-idempotency-key": dbOrderId },
      body: JSON.stringify({
        order_id: dbOrderId,
        order_amount: (totalAmount / 100).toFixed(2),
        order_currency: "INR",
        customer_details: {
          customer_id: isGuestOrder ? `guest_${dbOrderId}` : trustedUserId,
          customer_phone: customerPhone || "9999999999",
          customer_email: customerEmail || "guest@pantherclaw.in",
        },
        order_meta: {
          return_url: `${origin}/checkout/success?order_id=${dbOrderId}`,
        },
      }),
    });

    const cfData = await cfRes.json();
    if (!cfRes.ok) {
      // Mark the order failed so we do not leave dangling pendings.
      await supabase
        .rpc("mark_order_failed", {
          p_order_id: dbOrderId,
          p_reason: "Cashfree session creation failed",
        })
        .then(
          () => {},
          () => {},
        );
      return errorResponse(
        `Payment gateway error: ${cfData?.message || "could not start payment"}`,
        502,
        "cashfree_error",
      );
    }

    return jsonResponse({
      payment_session_id: cfData.payment_session_id,
      order_id: dbOrderId,
      order_number: orderData.order_number,
      amount: totalAmount,
    });
  } catch (error) {
    console.error("checkout error", error);
    return errorResponse(
      (error as Error).message || "Checkout failed",
      400,
      "checkout_failed",
    );
  }
});
