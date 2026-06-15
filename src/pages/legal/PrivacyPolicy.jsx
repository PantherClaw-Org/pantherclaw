import React from "react";
import PolicyLayout, {
  PolicyHeading,
  PolicyList,
} from "../../components/PolicyLayout";

export default function PrivacyPolicy() {
  return (
    <PolicyLayout
      title="Privacy Policy"
      description="How PANTHERCLAW collects, uses, and protects your personal data."
      lastUpdated="June 2026"
    >
      <p className="text-white/50 italic">
        This is a starting template. Review it with a legal advisor and replace
        the bracketed details before going live.
      </p>

      <p>
        This Privacy Policy explains how [Company Legal Name] (“PANTHERCLAW”,
        “we”, “us”) collects, uses, and safeguards your information when you
        visit or purchase from pantherclaw.in.
      </p>

      <PolicyHeading>Information we collect</PolicyHeading>
      <PolicyList
        items={[
          "Contact details you provide: name, email, phone number, and shipping address.",
          "Order information: items purchased, amounts, and delivery details.",
          "Account information if you create an account (email and saved addresses).",
          "Technical data: device, browser, and usage analytics collected via cookies.",
        ]}
      />

      <PolicyHeading>How we use your information</PolicyHeading>
      <PolicyList
        items={[
          "To process and deliver your orders and send order updates.",
          "To provide customer support and respond to your enquiries.",
          "To prevent fraud and secure our payments and accounts.",
          "To send marketing emails only where you have opted in (you can unsubscribe anytime).",
        ]}
      />

      <PolicyHeading>Payments</PolicyHeading>
      <p>
        Payments are processed securely by Cashfree Payments. We do not store
        your full card or UPI credentials on our servers. Payment processing is
        subject to Cashfree's own privacy terms.
      </p>

      <PolicyHeading>Data sharing</PolicyHeading>
      <p>
        We share data only with service providers who help us operate — payment
        gateways, shipping and logistics partners, email providers, and
        analytics — strictly to fulfil your orders and improve the service. We
        never sell your personal data.
      </p>

      <PolicyHeading>Your rights</PolicyHeading>
      <p>
        You can request access to, correction of, or deletion of your personal
        data by emailing [support email]. We retain order records as required by
        applicable tax and accounting law.
      </p>

      <PolicyHeading>Contact</PolicyHeading>
      <p>
        Questions about this policy? Email us at [support email] or write to
        [registered address].
      </p>
    </PolicyLayout>
  );
}
