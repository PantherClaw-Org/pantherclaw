import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import {
  sendEmail,
  orderShippedHtml,
  orderDeliveredHtml,
} from "../_shared/email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ORDER_EMAIL_SECRET = Deno.env.get("ORDER_EMAIL_SECRET") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Invoked by the orders status-change DB trigger (via pg_net) when an order
// moves to "shipped" or "delivered". Sends the matching transactional email.
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Shared-secret check (set ORDER_EMAIL_SECRET + pc_settings.order_email_secret).
    if (ORDER_EMAIL_SECRET) {
      const got = req.headers.get("x-pc-secret") || "";
      if (got !== ORDER_EMAIL_SECRET) {
        return errorResponse("Unauthorized", 401, "unauthorized");
      }
    }

    const body = await req.json();
    const orderId = body.order_id || body.orderId;
    const status = String(body.status || "").toLowerCase();

    if (!orderId)
      return errorResponse("Missing order id", 400, "missing_order");
    if (status !== "shipped" && status !== "delivered") {
      return jsonResponse({ ok: true, skipped: "unsupported_status" });
    }

    const { data: ord, error } = await supabase
      .from("orders")
      .select(
        "id, order_number, customer_email, carrier, tracking_number, tracking_url, order_items(product_name, size, color, quantity, price_at_purchase)",
      )
      .eq("id", orderId)
      .maybeSingle();
    if (error) throw error;
    if (!ord) return errorResponse("Order not found", 404, "not_found");
    if (!ord.customer_email)
      return jsonResponse({ ok: true, skipped: "no_email" });

    const items = (ord as any).order_items || [];

    if (status === "shipped") {
      await sendEmail({
        to: ord.customer_email,
        subject: `Your PANTHERCLAW order ${ord.order_number} has shipped`,
        html: orderShippedHtml(ord as any, items),
      });
    } else {
      await sendEmail({
        to: ord.customer_email,
        subject: `Your PANTHERCLAW order ${ord.order_number} was delivered`,
        html: orderDeliveredHtml(ord as any, items),
      });
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error("order-status-email error", e);
    return errorResponse((e as Error).message || "failed", 400, "failed");
  }
});
