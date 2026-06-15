import React from "react";
import PolicyLayout, {
  PolicyHeading,
  PolicyList,
} from "../../components/PolicyLayout";

export default function RefundPolicy() {
  return (
    <PolicyLayout
      title="Returns & Refunds"
      description="PANTHERCLAW's strict 5-day return policy and unboxing requirements."
      lastUpdated="June 2026"
    >
      <PolicyHeading>Strict 5-Day Return Window</PolicyHeading>
      <p>
        At PANTHERCLAW, we engineer premium denim meant to be worn, but we understand that sometimes the fit isn't right. We accept returns and exchanges strictly within <strong>5 days</strong> of the delivery date. After 5 days have passed since your package was marked as delivered, unfortunately, we cannot offer you a refund or exchange under any circumstances.
      </p>

      <div className="bg-white/5 border border-white/10 p-6 my-8 rounded-sm">
        <h3 className="font-sans text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Mandatory Unboxing Video</h3>
        <p className="mb-4">
          To protect against fraud and ensure the integrity of our products, <strong>an unboxing video is strictly mandatory</strong> for any return, exchange, or claim regarding missing/damaged items.
        </p>
        <PolicyList
          items={[
            "The video must show the package completely sealed before opening.",
            "The recording must be continuous, with no cuts or edits.",
            "The shipping label must be clearly visible in the video.",
            "The video must clearly show the defect or the exact items received.",
            "Without a valid unboxing video, your return request will be automatically rejected. No exceptions."
          ]}
        />
      </div>

      <PolicyHeading>Eligibility for Returns</PolicyHeading>
      <p>
        To be eligible for a return, your item must be unused, unwashed, and in the exact same condition that you received it. It must also be in the original packaging with all Pantherclaw tags fully attached. Any denim showing signs of wear, stretching, or odor will be rejected and sent back to you at your expense.
      </p>

      <PolicyHeading>How to start a return</PolicyHeading>
      <PolicyList
        items={[
          "Email support@pantherclaw.in with your Order Number and the Mandatory Unboxing Video attached.",
          "Our team will review the video within 24-48 hours.",
          "If approved, we will share a return shipping label and schedule a pickup.",
          "Once we receive and inspect the item at our warehouse, we will initiate your refund or dispatch your exchange."
        ]}
      />

      <PolicyHeading>Refund Process</PolicyHeading>
      <p>
        Once your return is received and inspected, we will send you an email to notify you of the approval or rejection of your refund. If approved, your refund will be processed, and a credit will automatically be applied to your original method of payment (via Cashfree) within 5–7 business days. Forward and return shipping charges are non-refundable unless the item was fundamentally defective.
      </p>

      <PolicyHeading>Non-returnable items</PolicyHeading>
      <PolicyList
        items={[
          "Items purchased during a flash sale or marked as 'Final Sale'.",
          "Items damaged through normal wear and tear or misuse.",
          "Items returned without the mandatory unboxing video.",
        ]}
      />
    </PolicyLayout>
  );
}
