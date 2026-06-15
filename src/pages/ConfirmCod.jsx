import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, XCircle, CheckCircle } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "../lib/supabase";

export default function ConfirmCod() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("id");
  const [status, setStatus] = useState("confirming");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!orderId) {
      setStatus("error");
      setErrorMsg("Invalid confirmation link.");
      return;
    }

    const confirmOrder = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("cashfree-checkout", {
          body: { action: "confirm-cod", orderId },
        });

        if (error) {
          throw new Error(error.message || "Failed to confirm order.");
        }

        if (data?.message === "Order is already confirmed or cancelled") {
          // Just redirect to success page, the success page will fetch the status
          // and show either success or failed.
          navigate(`/checkout/success?order_id=${orderId}`);
          return;
        }

        if (data?.success) {
          navigate(`/checkout/success?order_id=${orderId}`);
        } else {
          throw new Error(data?.error || "Failed to confirm order.");
        }
      } catch (err) {
        console.error("Confirm COD Error:", err);
        setStatus("error");
        setErrorMsg(err.message || "An unexpected error occurred.");
      }
    };

    confirmOrder();
  }, [orderId, navigate]);

  return (
    <div className="pt-32 px-4 min-h-[70vh] flex flex-col items-center justify-center text-center">
      <Helmet>
        <title>Confirming Order — PANTHERCLAW</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      {status === "confirming" && (
        <>
          <Loader2 className="w-16 h-16 animate-spin text-blue-500 mb-6" />
          <h1 className="text-3xl font-serif mb-2">Confirming Order</h1>
          <p className="text-ash max-w-md">
            Please wait while we lock in your Cash on Delivery order...
          </p>
        </>
      )}

      {status === "error" && (
        <>
          <XCircle className="w-16 h-16 text-red-500 mb-6" />
          <h1 className="text-3xl font-serif mb-2">Confirmation Failed</h1>
          <p className="text-ash mb-8 max-w-md">
            {errorMsg}
          </p>
          <button
            onClick={() => navigate("/contact")}
            className="bg-smoke text-black px-8 py-4 label hover:bg-white transition-colors"
          >
            Contact Support
          </button>
        </>
      )}
    </div>
  );
}
