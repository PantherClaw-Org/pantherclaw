import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CASHFREE_APP_ID = Deno.env.get("CASHFREE_APP_ID") || "";
const CASHFREE_SECRET_KEY = Deno.env.get("CASHFREE_SECRET_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, amount, customerId, customerPhone, customerEmail, orderMeta, cartItems } = await req.json();

    if (action === 'create-order') {
      
      let finalAddressId = orderMeta?.address_id || null;

      // 0. If guest checkout, create the address using Service Role to bypass RLS
      if (!finalAddressId && orderMeta?.guest_address) {
        const { data: newAddr, error: addrError } = await supabase
          .from('addresses')
          .insert([{
            label: 'Guest',
            address_line_1: orderMeta.guest_address.line1,
            city: orderMeta.guest_address.city,
            state: orderMeta.guest_address.state,
            postal_code: orderMeta.guest_address.postalCode,
            country: 'IN'
          }])
          .select('id')
          .single();
          
        if (addrError) throw addrError;
        finalAddressId = newAddr.id;
      }

      // 1. Create Order in Supabase with status 'pending'
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: customerId && !customerId.startsWith('guest_') ? customerId : null,
          status: 'pending',
          total_amount: amount,
          shipping_method: orderMeta?.shipping_method || 'standard',
          shipping_fee: orderMeta?.shipping_fee || 0,
          discount_id: orderMeta?.discount_id || null,
          discount_amount: orderMeta?.discount_amount || 0,
          address_id: finalAddressId
        }])
        .select('id')
        .single();

      if (orderError) throw orderError;
      const dbOrderId = orderData.id;

      // 2. Insert Order Items
      if (cartItems && cartItems.length > 0) {
        const itemsToInsert = cartItems.map((item: any) => ({
          order_id: dbOrderId,
          variant_id: item.variant_id,
          quantity: item.qty,
          price: item.price
        }));
        
        const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      // 3. Call Cashfree API to create the payment session using our DB Order ID
      const orderAmount = (amount / 100).toFixed(2);

      const response = await fetch("https://sandbox.cashfree.com/pg/orders", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': CASHFREE_APP_ID,
          'x-client-secret': CASHFREE_SECRET_KEY,
          'x-api-version': '2023-08-01',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          order_id: dbOrderId, // Use Supabase UUID
          order_amount: orderAmount,
          order_currency: "INR",
          customer_details: {
            customer_id: customerId,
            customer_phone: customerPhone || "9999999999",
            customer_email: customerEmail || "test@example.com"
          },
          order_meta: {
            return_url: `${req.headers.get("origin")}/checkout/success?order_id={order_id}`
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Cashfree error: ${JSON.stringify(data)}`);
      }

      return new Response(
        JSON.stringify({ payment_session_id: data.payment_session_id, order_id: dbOrderId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
