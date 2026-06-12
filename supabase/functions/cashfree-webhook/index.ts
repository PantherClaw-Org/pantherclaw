import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.177.0/crypto/mod.ts";
import { encode as encodeBase64 } from "https://deno.land/std@0.177.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CASHFREE_SECRET_KEY = Deno.env.get("CASHFREE_SECRET_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  try {
    // 1. Extract Signature Headers
    const signature = req.headers.get("x-webhook-signature");
    const timestamp = req.headers.get("x-webhook-timestamp");

    if (!signature || !timestamp) {
      return new Response("Missing signature headers", { status: 400 });
    }

    // 2. Read RAW body for verification (Crucial for Cashfree)
    const rawBody = await req.text();
    const payload = timestamp + rawBody;

    // 3. Verify HMAC-SHA256 Signature
    const hmac = createHmac("sha256", CASHFREE_SECRET_KEY);
    hmac.update(payload);
    // Deno's crypto digest returns ArrayBuffer, we must Base64 encode it
    const expectedSignature = encodeBase64(hmac.digest());

    if (signature !== expectedSignature) {
      console.error("Signature verification failed.");
      return new Response("Invalid Signature", { status: 401 });
    }

    // 4. Parse the verified payload
    const event = JSON.parse(rawBody);
    console.log("Verified Cashfree Webhook:", event.type);

    if (event.type === "PAYMENT_SUCCESS_WEBHOOK") {
      const order = event.data.order;
      
      const dbOrderId = order.order_id; // We passed the Supabase UUID into Cashfree!
      
      if (!dbOrderId) {
        throw new Error("Missing order_id in webhook payload.");
      }

      // 5. Update the existing order to 'paid'
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          // Optional: You could save cashfree's internal payment reference here if you add a column for it
          // cashfree_payment_id: payment.cf_payment_id
        })
        .eq('id', dbOrderId);

      if (updateError) throw updateError;
      
      console.log(`Successfully processed and marked paid for order ${dbOrderId}`);
    }

    return new Response("Webhook processed", { status: 200 });

  } catch (err) {
    console.error("Webhook Error:", err);
    return new Response(`Webhook Error: ${err.message}`, { status: 500 });
  }
});
