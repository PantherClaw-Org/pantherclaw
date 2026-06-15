import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";
import { sendEmail, abandonedCartHtml } from "../_shared/email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ORDER_EMAIL_SECRET = Deno.env.get("ORDER_EMAIL_SECRET") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Sends a single reminder for carts idle for 30+ minutes. Invoked on a cron
// schedule (pg_cron -> net.http_post, see SETUP.md). Idempotent per cart via
// reminder_sent_at, so re-running it never double-emails.
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Shared-secret auth (same secret as the order-status notifier).
  if (
    ORDER_EMAIL_SECRET &&
    req.headers.get("x-pc-secret") !== ORDER_EMAIL_SECRET
  ) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  let sent = 0;

  try {
    let siteUrl = "https://pantherclaw.in";
    const { data: setting } = await supabase
      .from("pc_settings")
      .select("value")
      .eq("key", "site_url")
      .maybeSingle();
    if (setting?.value) siteUrl = setting.value;

    const { data: sessions, error } = await supabase
      .from("cart_sessions")
      .select("id, user_id, contact_email")
      .is("reminder_sent_at", null)
      .lt("last_activity_at", cutoff)
      .limit(50);
    if (error) throw error;

    for (const s of sessions || []) {
      // Resolve a recipient: explicit contact email, else the account email.
      let email = s.contact_email || "";
      if (!email && s.user_id) {
        const { data: u } = await supabase
          .from("users")
          .select("email")
          .eq("id", s.user_id)
          .maybeSingle();
        email = u?.email || "";
      }
      if (!email) continue;

      const { data: items } = await supabase
        .from("cart_items")
        .select("quantity, price_at_add, product_variants(products(name))")
        .eq("session_id", s.id);
      if (!items || items.length === 0) continue;

      const mapped = items.map((it: any) => ({
        product_name: it.product_variants?.products?.name || "Your item",
        quantity: it.quantity,
        price_at_purchase: it.price_at_add,
      }));

      try {
        await sendEmail({
          to: email,
          subject: "You left something behind",
          html: abandonedCartHtml(mapped, `${siteUrl}/shop`),
        });
        await supabase
          .from("cart_sessions")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", s.id);
        sent++;
      } catch (e) {
        console.error("abandoned-cart send failed:", (e as Error).message);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("abandoned-cart-email error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
