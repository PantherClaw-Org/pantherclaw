import React from "react";
import PolicyLayout, {
  PolicyHeading,
  PolicyList,
} from "../../components/PolicyLayout";

export default function RefundPolicy() {
  return (
    <PolicyLayout
      title="Returns & Refunds"
      description="PANTHERCLAW's return, exchange, and refund policy."
      lastUpdated="June 2026"
    >
      <p className="text-white/50 italic">
        This is a starting template. Confirm the exact windows and conditions
        for your business before going live.
      </p>

      <PolicyHeading>Return window</PolicyHeading>
      <p>
        We accept returns and exchanges within [7] days of delivery. Items must
        be unworn, unwashed, with original tags attached and in their original
        packaging.
      </p>

      <PolicyHeading>How to start a return</PolicyHeading>
      <PolicyList
        items={[
          "Email [support email] with your order number and the item(s) you'd like to return.",
          "We'll share a return shipping label or pickup details.",
          "Once we receive and inspect the item, we'll confirm your refund or exchange.",
        ]}
      />

      <PolicyHeading>Refunds</PolicyHeading>
      <p>
        Approved refunds are issued to your original payment method within [5–7]
        business days of us receiving the returned item. Shipping fees are
        non-refundable unless the item was defective or incorrect.
      </p>

      <PolicyHeading>Exchanges</PolicyHeading>
      <p>
        Need a different size? We're happy to exchange subject to availability.
        If the new item differs in price, we'll collect or refund the
        difference.
      </p>

      <PolicyHeading>Non-returnable items</PolicyHeading>
      <PolicyList
        items={[
          "Items marked Final Sale.",
          "Items damaged through normal wear or misuse.",
          "Items returned without tags or original packaging.",
        ]}
      />

      <PolicyHeading>Damaged or wrong items</PolicyHeading>
      <p>
        If your order arrives damaged or incorrect, email us within 48 hours of
        delivery with photos and we'll make it right at no cost to you.
      </p>
    </PolicyLayout>
  );
}
