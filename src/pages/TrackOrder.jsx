import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { formatPrice } from "../lib/api";

// Public order lookup for guests (and anyone) using order number + email.
// The lookup runs server-side (edge function) so RLS never has to expose
// orders to anon users.
export default function TrackOrder() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setOrder(null);
    setLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke(
        "lookup-order",
        { body: { order_number: orderNumber.trim(), email: email.trim() } },
      );
      if (fnErr) throw fnErr;
      if (data?.error) {
        setError(data.error.message || "Order not found.");
      } else if (data?.order) {
        setOrder(data.order);
      } else {
        setError("Order not found. Check your details and try again.");
      }
    } catch {
      setError("We couldn't find that order. Please double-check and retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 pb-24 pt-32 sm:px-6 md:px-12">
      <Helmet>
        <title>Track Your Order — PANTHERCLAW</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="mx-auto max-w-xl">
        <h1 className="mb-2 font-serif text-4xl">Track Your Order</h1>
        <p className="mb-10 text-ash">
          Enter your order number and the email used at checkout.
        </p>

        <form
          onSubmit={submit}
          className="space-y-5"
          data-testid="track-order-form"
        >
          <div>
            <label className="text-sm font-medium">Order Number</label>
            <input
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="PC-XXXXXX"
              className="mt-2 w-full bg-transparent border border-white/10 px-4 py-3 focus:border-smoke focus:outline-none"
              data-testid="track-order-number"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="mt-2 w-full bg-transparent border border-white/10 px-4 py-3 focus:border-smoke focus:outline-none"
              data-testid="track-order-email"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="label flex w-full items-center justify-center gap-2 bg-smoke px-8 py-4 text-black transition-colors hover:bg-white disabled:opacity-50"
            data-testid="track-order-submit"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              "Find My Order"
            )}
          </button>
        </form>

        {error && (
          <p
            className="mt-6 text-sm text-red-500"
            data-testid="track-order-error"
          >
            {error}
          </p>
        )}

        {order && (
          <div
            className="mt-10 border border-white/10 p-6"
            data-testid="track-order-result"
          >
            <div className="flex justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-xs text-ash">Order</p>
                <p className="font-medium">{order.order_number}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-ash">Status</p>
                <p className="font-medium capitalize">{order.status}</p>
              </div>
            </div>

            {(order.carrier || order.tracking_number) && (
              <div className="border-b border-white/10 py-4 text-sm">
                {order.carrier && (
                  <p>
                    Carrier: <strong>{order.carrier}</strong>
                  </p>
                )}
                {order.tracking_number && (
                  <p>Tracking #: {order.tracking_number}</p>
                )}
                {order.tracking_url && (
                  <a
                    href={order.tracking_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block underline"
                  >
                    Track shipment →
                  </a>
                )}
              </div>
            )}

            <ul className="divide-y divide-line">
              {(order.order_items || []).map((it) => (
                <li key={it.id} className="flex justify-between py-3 text-sm">
                  <span>
                    {it.product_name} · {it.size}
                    {it.color ? ` / ${it.color}` : ""} ×{it.quantity}
                  </span>
                  <span>{formatPrice(it.price_at_purchase * it.quantity)}</span>
                </li>
              ))}
            </ul>

            <div className="flex justify-between pt-4 font-medium">
              <span>Total</span>
              <span>{formatPrice(order.total_amount)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
