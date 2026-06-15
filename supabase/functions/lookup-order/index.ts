import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Guest-safe order lookup. Requires BOTH the order number and the matching
// email, and never reveals whether an order number exists on its own.
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const orderNumber = String(body.order_number || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    if (!orderNumber || !email) {
      return jsonResponse({
        error: {
          message: "Order number and email are required.",
          code: "missing_fields",
        },
      });
    }

    const { data, error } = await supabase
      .from("orders")
      .select(
        "order_number, status, total_amount, carrier, tracking_number, tracking_url, customer_email, order_items(id, product_name, size, color, quantity, price_at_purchase)",
      )
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (error) throw error;

    // Only confirm the order when the email also matches.
    if (!data || String(data.customer_email || "").toLowerCase() !== email) {
      return jsonResponse({
        error: {
          message: "No matching order found. Check the order number and email.",
          code: "not_found",
        },
      });
    }

    // Strip the email before returning to the client.
    const { customer_email: _omit, ...safe } = data as Record<string, unknown>;
    return jsonResponse({ order: safe });
  } catch (e) {
    console.error("lookup-order error", e);
    return jsonResponse(
      {
        error: { message: "Lookup failed. Please try again.", code: "failed" },
      },
      500,
    );
  }
});
