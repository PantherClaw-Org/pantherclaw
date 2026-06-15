import React from "react";
import PolicyLayout, {
  PolicyHeading,
  PolicyList,
} from "../../components/PolicyLayout";

export default function TermsOfService() {
  return (
    <PolicyLayout
      title="Terms of Service"
      description="The definitive terms governing your use of PANTHERCLAW and our premium denim."
      lastUpdated="June 2026"
    >
      <p>
        Welcome to PANTHERCLAW. These Terms of Service ("Terms") govern your access to and use of pantherclaw.in and the purchase of any products from PANTHERCLAW. By accessing our website, browsing our collections, or placing an order, you agree to be bound by these Terms.
      </p>

      <PolicyHeading>1. General Conditions</PolicyHeading>
      <p>
        We reserve the right to refuse service to anyone for any reason at any time. You understand that your content (not including credit card or UPI information), may be transferred unencrypted and involve transmissions over various networks. All payment processing is strictly handled via encrypted, PCI-compliant gateways (Cashfree).
      </p>

      <PolicyHeading>2. Pricing & Orders</PolicyHeading>
      <PolicyList
        items={[
          "All prices are listed in Indian Rupees (₹) and include applicable GST.",
          "We reserve the right to modify prices without notice. Past orders will not be affected.",
          "We reserve the right to refuse or cancel any order, particularly in cases of suspected fraud, unauthorized reselling, or pricing errors.",
          "An order is only confirmed once payment is successfully authorized and captured."
        ]}
      />

      <PolicyHeading>3. Product Representation</PolicyHeading>
      <p>
        We have made every effort to display as accurately as possible the colors, washes, and textures of our denim. However, as computer monitors vary, we cannot guarantee that your monitor's display of any color will be perfectly accurate. Because our denim undergoes specialized washing processes, slight variations in fade and texture are intentional and part of the design.
      </p>

      <PolicyHeading>4. Intellectual Property</PolicyHeading>
      <p>
        PANTHERCLAW is a registered brand. All content on this site—including but not limited to the PANTHERCLAW name, logo, typography, editorial imagery, graphics, and garment designs—is the exclusive intellectual property of PANTHERCLAW. You may not reproduce, duplicate, copy, sell, or exploit any portion of the Service or products without express written permission from us.
      </p>

      <PolicyHeading>5. User Conduct</PolicyHeading>
      <p>
        You agree not to use our products for any illegal or unauthorized purpose. You must not transmit any worms or viruses or any code of a destructive nature. A breach or violation of any of the Terms will result in an immediate termination of your Services.
      </p>

      <PolicyHeading>6. Limitation of Liability</PolicyHeading>
      <p>
        In no case shall PANTHERCLAW, our directors, officers, employees, or affiliates be liable for any injury, loss, claim, or any direct, indirect, incidental, punitive, or consequential damages of any kind, including, without limitation lost profits, lost revenue, or any similar damages arising from your use of the service or any products procured using the service.
      </p>

      <PolicyHeading>7. Governing Law</PolicyHeading>
      <p>
        These Terms of Service and any separate agreements whereby we provide you Services shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India.
      </p>
    </PolicyLayout>
  );
}
