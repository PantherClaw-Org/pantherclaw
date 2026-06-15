import React from "react";
import PolicyLayout, {
  PolicyHeading,
  PolicyList,
} from "../../components/PolicyLayout";

export default function ShippingPolicy() {
  return (
    <PolicyLayout
      title="Shipping Policy"
      description="Delivery timelines, shipping fees, and tracking for PANTHERCLAW."
      lastUpdated="June 2026"
    >
      <PolicyHeading>1. Shipping Fees & Free Shipping</PolicyHeading>
      <p>
        We charge a flat shipping rate for single-item orders to ensure reliable and fast delivery via premium courier partners. However, <strong>if you order 2 or more items, your entire order qualifies for 100% Free Standard Shipping</strong> across India. Cash on Delivery (COD) orders may incur a nominal handling fee, which will be clearly displayed during checkout.
      </p>

      <PolicyHeading>2. Order Processing</PolicyHeading>
      <p>
        Quality takes time. All orders are processed and dispatched from our warehouse within <strong>1–2 business days</strong> (excluding weekends and public holidays). You will receive a confirmation email once your order is placed, and a second email containing your tracking information once your package has been handed over to our delivery partners.
      </p>

      <PolicyHeading>3. Delivery Timelines</PolicyHeading>
      <PolicyList
        items={[
          "Metro Cities (Mumbai, Delhi, Bangalore, etc.): 2–4 business days after dispatch.",
          "Tier 2 & Tier 3 Cities: 4–7 business days after dispatch.",
          "Remote Locations (North East, J&K, etc.): 7–10 business days after dispatch."
        ]}
      />
      <p className="mt-4 text-white/50 text-sm">
        *Please note that these are estimated timelines. External factors such as extreme weather or logistical strikes may occasionally cause delays.
      </p>

      <PolicyHeading>4. Order Tracking</PolicyHeading>
      <p>
        Once your order ships, you will receive an AWB (Airway Bill) tracking number via email and SMS. You can use this number on our Track Order page or directly on our courier partner's website to monitor your shipment in real time.
      </p>

      <PolicyHeading>5. Missing or Lost Packages</PolicyHeading>
      <p>
        If your tracking shows as 'Delivered' but you have not received your package, please contact us at support@pantherclaw.in within 48 hours. We will immediately escalate the issue with our courier partners. PANTHERCLAW is not responsible for packages lost due to incorrect addresses provided by the customer at checkout.
      </p>

      <PolicyHeading>6. International Shipping</PolicyHeading>
      <p>
        Currently, PANTHERCLAW ships exclusively within India. We are working diligently to expand our logistics network and bring our denim to a global audience. Stay tuned to our social media for updates on international availability.
      </p>
    </PolicyLayout>
  );
}
