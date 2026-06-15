import React from "react";
import { Helmet } from "react-helmet-async";

// Shared layout for legal / policy pages. Matches the site's dark aesthetic
// (black background, light text).
export default function PolicyLayout({
  title,
  description,
  lastUpdated,
  children,
}) {
  return (
    <div className="pt-32 pb-24 px-4 sm:px-6 md:px-12 max-w-[820px] mx-auto min-h-screen">
      <Helmet>
        <title>{`${title} — PANTHERCLAW`}</title>
        <meta name="description" content={description || title} />
      </Helmet>
      <h1 className="font-serif text-4xl md:text-5xl text-smoke mb-3">
        {title}
      </h1>
      {lastUpdated && (
        <p className="text-white/40 text-sm mb-10">
          Last updated: {lastUpdated}
        </p>
      )}
      <div className="policy space-y-5 leading-relaxed text-[15px] text-white/70">
        {children}
      </div>
    </div>
  );
}

// Small helpers so each policy page stays readable.
export function PolicyHeading({ children }) {
  return (
    <h2 className="font-serif text-2xl text-smoke mt-10 mb-1">{children}</h2>
  );
}

export function PolicyList({ items }) {
  return (
    <ul className="list-disc pl-5 space-y-2 text-white/70">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}
