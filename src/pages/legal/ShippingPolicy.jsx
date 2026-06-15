import React from "react";
import PolicyLayout, {
  PolicyHeading,
  PolicyList,
} from "../../components/PolicyLayout";

export default function ShippingPolicy() {
  return (
    <PolicyLayout
      title="Shipping Policy"
      description="Delivery timelines, charges, and tracking for PANTHERCLAW orders."
      lastUpdated="June 2026"
    >
      <p className="text-white/50 italic">
        This is a starting template. Confirm timelines and charges with your
        logistics partner before going live.
      </p>

      <PolicyHeading>Processing time</PolicyHeading>
      <p>
        Orders are processed within [1–2] business days. You'll receive an email
        confirmation when your order is placed, and another once it ships.
      </p>

      <PolicyHeading>Delivery timelines</PolicyHeading>
      <PolicyList
        items={[
          "Standard shipping: 3–5 business days after dispatch.",
          "Express shipping: 1–2 business days after dispatch.",
          "Remote locations may take slightly longer.",
        ]}
      />

      <PolicyHeading>Shipping charges</PolicyHeading>
      <p>
        Shipping is calculated at checkout based on your method and order value.
        Orders above [free-shipping threshold] qualify for free standard
        shipping.
      </p>

      <PolicyHeading>Tracking</PolicyHeading>
      <p>
        Once dispatched, you'll receive a tracking link by email. You can also
        view order status anytime under your account.
      </p>

      <PolicyHeading>International shipping</PolicyHeading>
      <p>
        We currently ship within India. International shipping is [not available
        yet / available to select countries] — update this section as your
        coverage grows.
      </p>
    </PolicyLayout>
  );
}
