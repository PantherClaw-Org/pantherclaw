import React from "react";
import PolicyLayout, {
  PolicyHeading,
  PolicyList,
} from "../../components/PolicyLayout";

export default function TermsOfService() {
  return (
    <PolicyLayout
      title="Terms of Service"
      description="The terms governing your use of PANTHERCLAW and purchases made on our store."
      lastUpdated="June 2026"
    >
      <p className="text-white/50 italic">
        This is a starting template. Review it with a legal advisor and replace
        the bracketed details before going live.
      </p>

      <p>
        These Terms of Service govern your access to and use of pantherclaw.in,
        operated by [Company Legal Name]. By using the site or placing an order,
        you agree to these terms.
      </p>

      <PolicyHeading>Orders and pricing</PolicyHeading>
      <PolicyList
        items={[
          "All prices are listed in Indian Rupees (₹) and are inclusive of applicable taxes unless stated otherwise.",
          "We reserve the right to refuse or cancel any order, including in cases of suspected fraud or pricing errors.",
          "An order is confirmed only once payment is successfully received and verified.",
        ]}
      />

      <PolicyHeading>Products</PolicyHeading>
      <p>
        We make every effort to display product colours and details accurately,
        but actual colours may vary slightly depending on your screen. Stock
        availability is not guaranteed until your order is confirmed.
      </p>

      <PolicyHeading>Accounts</PolicyHeading>
      <p>
        You are responsible for keeping your account credentials secure and for
        all activity under your account. Notify us immediately of any
        unauthorised use.
      </p>

      <PolicyHeading>Intellectual property</PolicyHeading>
      <p>
        All content on this site — including the PANTHERCLAW name, logo,
        imagery, and designs — is our property and may not be reproduced without
        written permission.
      </p>

      <PolicyHeading>Limitation of liability</PolicyHeading>
      <p>
        To the extent permitted by law, PANTHERCLAW is not liable for indirect
        or consequential damages arising from the use of our products or
        website.
      </p>

      <PolicyHeading>Governing law</PolicyHeading>
      <p>
        These terms are governed by the laws of India, and disputes are subject
        to the exclusive jurisdiction of the courts of [city, state].
      </p>
    </PolicyLayout>
  );
}
