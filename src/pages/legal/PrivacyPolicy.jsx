import React from "react";
import PolicyLayout, {
  PolicyHeading,
  PolicyList,
} from "../../components/PolicyLayout";

export default function PrivacyPolicy() {
  return (
    <PolicyLayout
      title="Privacy Policy"
      description="How PANTHERCLAW collects, uses, and fiercely protects your personal data in compliance with the DPDP Act 2023."
      lastUpdated="June 2026"
    >
      <p>
        At PANTHERCLAW, we respect your privacy and are committed to protecting your personal data. This Privacy Policy details how we collect, use, and safeguard your information when you visit pantherclaw.in or make a purchase from our store, in strict compliance with India's Digital Personal Data Protection (DPDP) Act, 2023.
      </p>

      <PolicyHeading>1. Information We Collect (With Your Consent)</PolicyHeading>
      <p>We only collect personal data (as a Data Fiduciary) when you provide explicit, free, and informed consent. This includes:</p>
      <PolicyList
        items={[
          "Identity & Contact Data: Your name, email address, phone number, shipping address, and billing address.",
          "Transaction Data: Details about payments to and from you, including the specific denim pieces you have purchased.",
          "Technical Data: IP address, browser type, and analytics collected via Microsoft Clarity and Google Analytics (ONLY if you explicitly accept our Cookie Consent Banner)."
        ]}
      />

      <PolicyHeading>2. How We Use Your Information</PolicyHeading>
      <p>We process your data strictly for the purposes you have consented to, which include:</p>
      <PolicyList
        items={[
          "To process and deliver your orders accurately and securely.",
          "To send you transactional emails (order confirmations, shipping updates) via orders@pantherclaw.in.",
          "To provide customer support and handle any exchanges via support@pantherclaw.in.",
          "To improve our website layout and customer experience (using consented analytics data).",
          "To send marketing communications, strictly if you have opted in (you may withdraw consent at any time)."
        ]}
      />

      <PolicyHeading>3. Data Principal Rights (Your Rights)</PolicyHeading>
      <p>
        Under the DPDP Act 2023, you as a Data Principal hold specific rights regarding your personal data. You have the right to:
      </p>
      <PolicyList
        items={[
          "Right to Information: Request a summary of the personal data being processed by us and the underlying processing activities.",
          "Right to Correction & Erasure: Request the correction of inaccurate data, or the complete erasure of your personal data when it is no longer necessary for the purpose it was collected.",
          "Right to Withdraw Consent: You may withdraw your consent for data processing (e.g., analytics or marketing) at any time. Withdrawal does not affect the legality of processing prior to withdrawal."
        ]}
      />
      <p className="mt-4">
        To exercise any of these rights, please email our Data Protection Officer at <strong>privacy@pantherclaw.in</strong>.
      </p>

      <PolicyHeading>4. Data Retention</PolicyHeading>
      <p>
        We retain your personal data only for as long as is necessary to fulfill the purpose for which it was collected, including for the purposes of satisfying any legal, accounting, or reporting requirements. Under DPDP compliance guidelines, user data that is no longer required for business or legal purposes will be securely erased.
      </p>

      <PolicyHeading>5. Payment Security & Third-Party Processors</PolicyHeading>
      <p>
        We do not process or store your credit card, debit card, or UPI details on our servers. All transactions are securely processed through our authorized payment gateway, Cashfree Payments. We ensure that our Data Processors (logistics partners and payment gateways) are contractually bound to comply with the DPDP Act.
      </p>

      <PolicyHeading>6. Grievance Redressal Mechanism</PolicyHeading>
      <p>
        If you have any grievances regarding the processing of your personal data or a breach of your rights under the DPDP Act, you may contact our designated Grievance Officer / Data Protection Officer. We are committed to resolving your concerns promptly.
      </p>
      <PolicyList
        items={[
          "For Privacy & Data Rights: privacy@pantherclaw.in",
          "For Legal & Escalations: legal@pantherclaw.in",
          "For General Support & Orders: support@pantherclaw.in or orders@pantherclaw.in"
        ]}
      />
    </PolicyLayout>
  );
}
