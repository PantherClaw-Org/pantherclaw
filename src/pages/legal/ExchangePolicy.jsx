import React from "react";
import PolicyLayout, {
  PolicyHeading,
  PolicyList,
} from "../../components/PolicyLayout";

export default function ExchangePolicy() {
  return (
    <PolicyLayout
      title="Exchange Policy (No Refunds)"
      description="PANTHERCLAW's strict 5-day exchange policy and unboxing requirements."
      lastUpdated="June 2026"
    >
      <PolicyHeading>Strict 5-Day Exchange Window</PolicyHeading>
      <p>
        At PANTHERCLAW, we engineer premium denim meant to be worn. Due to the limited nature of our drops and the hygiene standards of premium apparel, <strong>we do not offer refunds under any circumstances</strong>. However, we do accept <strong>exchanges for sizing issues or defects</strong> strictly within <strong>5 days</strong> of the delivery date. After 5 days have passed since your package was marked as delivered, unfortunately, we cannot offer you an exchange.
      </p>

      <div className="bg-white/5 border border-white/10 p-6 my-8 rounded-sm">
        <h3 className="font-sans text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Mandatory Unboxing Video</h3>
        <p className="mb-4">
          To protect against fraud and ensure the integrity of our products, <strong>an unboxing video is strictly mandatory</strong> for any exchange claim.
        </p>
        <PolicyList
          items={[
            "The video must show the package completely sealed before opening.",
            "The recording must be continuous, with no cuts or edits.",
            "The shipping label must be clearly visible in the video.",
            "The video must clearly show the defect or the exact items received.",
            "Without a valid unboxing video, your exchange request will be automatically rejected. No exceptions."
          ]}
        />
      </div>

      <PolicyHeading>Eligibility for Exchanges</PolicyHeading>
      <p>
        To be eligible for a size exchange, your item must be unused, unwashed, and in the exact same condition that you received it. It must also be in the original packaging with all Pantherclaw tags fully attached. Any denim showing signs of wear, stretching, or odor will be rejected and sent back to you at your expense.
      </p>

      <PolicyHeading>How to start an exchange</PolicyHeading>
      <PolicyList
        items={[
          "Email support@pantherclaw.in with your Order Number, the size you need, and the Mandatory Unboxing Video attached.",
          "Our team will review the video within 24-48 hours.",
          "If approved, we will share a return shipping label and schedule a pickup.",
          "Once we receive and inspect the item at our warehouse, we will dispatch your new size."
        ]}
      />

      <PolicyHeading>Non-exchangeable items</PolicyHeading>
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
