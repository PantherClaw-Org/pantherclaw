import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { useCartStore } from "../store/cartStore";

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order_id");
  const { clear } = useCartStore();
  
  const [status, setStatus] = useState("processing"); // processing, success, failed

  useEffect(() => {
    if (!orderId) {
      setStatus("failed");
      return;
    }

    // In a production app, the backend Cashfree Webhook is securely processing the order.
    // The frontend just needs to clear the cart and show success.
    const finishCheckout = async () => {
      try {
        // Clear local cart
        await clear();
        
        // Remove temporary localStorage variables
        localStorage.removeItem('checkout_address_id');
        
        setStatus("success");
      } catch (err) {
        console.error("Error finishing checkout frontend:", err);
        setStatus("failed");
      }
    };

    // Simulate a brief loading state for UX
    const timer = setTimeout(() => {
      finishCheckout();
    }, 1500);

    return () => clearTimeout(timer);
  }, [orderId, clear]);

  return (
    <div className="pt-32 px-4 min-h-[70vh] flex flex-col items-center justify-center text-center">
      {status === "processing" && (
        <>
          <Loader2 className="w-16 h-16 animate-spin text-blue-500 mb-6" />
          <h1 className="text-3xl font-serif mb-2">Verifying Payment</h1>
          <p className="text-ash">Please wait while we confirm your transaction...</p>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle className="w-16 h-16 text-green-500 mb-6" />
          <h1 className="text-3xl font-serif mb-2">Payment Successful!</h1>
          <p className="text-ash mb-8">Your order has been placed. You will receive a confirmation email shortly.</p>
          <div className="flex gap-4">
            <button 
              onClick={() => navigate("/account")}
              className="border border-line text-ink px-8 py-4 label hover:bg-smoke transition-colors"
            >
              View Order
            </button>
            <button 
              onClick={() => navigate("/shop")}
              className="bg-ink text-smoke px-8 py-4 label hover:bg-[#262626] transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </>
      )}

      {status === "failed" && (
        <>
          <XCircle className="w-16 h-16 text-red-500 mb-6" />
          <h1 className="text-3xl font-serif mb-2">Payment Failed</h1>
          <p className="text-ash mb-8">We could not verify your payment session.</p>
          <button 
            onClick={() => navigate("/checkout")}
            className="bg-ink text-smoke px-8 py-4 label hover:bg-[#262626] transition-colors"
          >
            Try Again
          </button>
        </>
      )}
    </div>
  );
}
