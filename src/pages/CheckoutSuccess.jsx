import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useCartStore } from "../store/cartStore";
import { supabase } from "../lib/supabase";
import { formatPrice } from "../lib/api";
import { trackPurchase } from "../lib/analytics";
import { useAuth } from "../context/AuthContext";

const PAID_STATUSES = [
  "paid",
  "completed",
  "success",
  "confirmed",
  "shipped",
  "delivered",
  "fulfilled",
];
const FAILED_STATUSES = ["failed", "cancelled", "canceled", "payment_failed"];
const MAX_POLLS = 12; // ~30s at 2.5s interval

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order_id");
  const { clear } = useCartStore();
  const { user } = useAuth();

  // processing | success | failed | timeout | action_required
  const [status, setStatus] = useState("processing");
  const [order, setOrder] = useState(null);
  const clearedRef = useRef(false);

  useEffect(() => {
    if (!orderId) {
      setStatus("failed");
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const { data, error } = await supabase.functions.invoke(
          "cashfree-checkout",
          {
            body: { action: "verify-order", order_id: orderId },
          },
        );
        if (error) throw error;

        const ord = data?.order;
        if (cancelled) return;

        if (ord) {
          setOrder(ord);
          const s = String(ord.status || "").toLowerCase();

          if (PAID_STATUSES.includes(s)) {
            // Clear the cart only once we have a confirmed payment.
            if (!clearedRef.current) {
              clearedRef.current = true;
              await clear();
              try { localStorage.removeItem("checkout_address_id"); } catch (e) {}
              try {
                trackPurchase({
                  transactionId: ord.order_number || ord.id,
                  value: (ord.total_amount || 0) / 100,
                  currency: ord.currency || "INR",
                  items: (ord.order_items || []).map((it) => ({
                    item_id: it.variant_id || it.product_name,
                    item_name: it.product_name,
                    price: (it.price_at_purchase || 0) / 100,
                    quantity: it.quantity,
                  })),
                });
              } catch (e) {
                /* analytics must never block the success screen */
              }
            }
            setStatus("success");
            return;
          }

          if (s === "pending" && ord.payment_method === "cod") {
            if (!clearedRef.current) {
              clearedRef.current = true;
              await clear();
              try { localStorage.removeItem("checkout_address_id"); } catch (e) {}
              // We do not fire trackPurchase until they confirm the COD order.
            }
            setStatus("action_required");
            return;
          }

          if (FAILED_STATUSES.includes(s)) {
            setStatus("failed");
            return;
          }
        }

        // Still pending — the webhook may not have landed yet. Keep polling.
        if (attempts >= MAX_POLLS) {
          setStatus("timeout");
          return;
        }
        if (!cancelled) setTimeout(poll, 2500);
      } catch (err) {
        console.error("verify-order failed:", err);
        if (attempts >= MAX_POLLS) {
          if (!cancelled) setStatus("timeout");
        } else if (!cancelled) {
          setTimeout(poll, 2500);
        }
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [orderId, clear]);

  return (
    <div className="pt-32 px-4 min-h-[70vh] flex flex-col items-center justify-center text-center">
      <Helmet>
        <title>Order Confirmation — PANTHERCLAW</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      {status === "processing" && (
        <>
          <Loader2 className="w-16 h-16 animate-spin text-blue-500 mb-6" />
          <h1 className="text-3xl font-serif mb-2">Verifying Payment</h1>
          <p className="text-ash">
            Please wait while we confirm your transaction…
          </p>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle className="w-16 h-16 text-green-500 mb-6" />
          <h1 className="text-3xl font-serif mb-2">Order Successful!</h1>
          {order?.order_number && (
            <p className="text-ash mb-1">
              Order{" "}
              <span className="font-medium text-smoke">
                {order.order_number}
              </span>
            </p>
          )}
          <p className="text-ash mb-8">A confirmation email is on its way.</p>

          {order?.order_items?.length > 0 && (
            <div className="w-full max-w-md text-left border border-white/10 bg-[#111] p-5 mb-8">
              <ul className="space-y-3">
                {order.order_items.map((it, idx) => (
                  <li key={idx} className="flex justify-between text-sm">
                    <span className="text-smoke">
                      {it.product_name}
                      <span className="text-ash">
                        {" "}
                        × {it.quantity}
                        {it.size ? ` · ${it.size}` : ""}
                      </span>
                    </span>
                    <span className="font-medium">
                      {formatPrice(it.price_at_purchase * it.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between border-t border-white/10 mt-4 pt-3 font-semibold">
                <span>Total</span>
                <span>{formatPrice(order.total_amount)}</span>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => navigate(user ? "/account" : "/track-order")}
              className="border border-white/10 text-smoke px-8 py-4 label hover:bg-white/5 transition-colors"
            >
              {user ? "View Orders" : "Track Order"}
            </button>
            <button
              onClick={() => navigate("/shop")}
              className="bg-smoke text-black px-8 py-4 label hover:bg-white transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </>
      )}

      {status === "timeout" && (
        <>
          <Loader2 className="w-16 h-16 text-amber-500 mb-6" />
          <h1 className="text-3xl font-serif mb-2">Still Confirming…</h1>
          <p className="text-ash mb-8 max-w-md">
            Your payment is being processed. This can take a moment. We’ll email
            you as soon as it’s confirmed — you can also check your orders
            anytime.
          </p>
          <Link
            to={user ? "/account" : "/track-order"}
            className="bg-smoke text-black px-8 py-4 label hover:bg-white transition-colors"
          >
            {user ? "View Orders" : "Track Order"}
          </Link>
        </>
      )}

      {status === "action_required" && (
        <div className="bg-[#fcefc7] text-[#856404] p-8 max-w-lg border-2 border-[#ffeeba]">
          <h1 className="text-3xl font-serif mb-4 font-bold uppercase tracking-widest">Action Required</h1>
          <p className="mb-6 text-lg">
            We have received your Cash on Delivery request. To secure your items and complete the order, you <strong>must</strong> confirm it via email.
          </p>
          <div className="bg-white/50 p-6 border border-[#ffeeba] mb-6 text-left">
            <h2 className="font-bold mb-2 text-black">What to do next:</h2>
            <ol className="list-decimal pl-5 space-y-2 text-black">
              <li>Open your email inbox ({order?.customer_email || "the email you provided"}).</li>
              <li>Find the email from <strong>PANTHERCLAW</strong>.</li>
              <li>Click the <strong>Confirm Order</strong> button.</li>
            </ol>
          </div>
          <p className="text-sm opacity-80 mb-8 font-medium">
            ⚠️ If you do not confirm within 30 minutes, your order will be automatically cancelled and the items will be released back to the store.
          </p>
          <button
            onClick={() => navigate("/")}
            className="bg-[#856404] text-white px-8 py-4 label hover:bg-[#6c5103] transition-colors uppercase tracking-widest"
          >
            Return to Store
          </button>
        </div>
      )}

      {status === "failed" && (
        <>
          <XCircle className="w-16 h-16 text-red-500 mb-6" />
          <h1 className="text-3xl font-serif mb-2">Payment Failed</h1>
          <p className="text-ash mb-8">
            We couldn’t confirm your payment. You have not been charged.
          </p>
          <button
            onClick={() => navigate("/checkout")}
            className="bg-smoke text-black px-8 py-4 label hover:bg-white transition-colors"
          >
            Try Again
          </button>
        </>
      )}
    </div>
  );
}
