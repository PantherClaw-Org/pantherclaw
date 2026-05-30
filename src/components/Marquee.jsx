import React from "react";

const items = [
  "FREE SHIPPING ACROSS INDIA",
  "ENGINEERED IN INDIA",
  "100% COTTON DENIM",
  "EASY 7-DAY RETURNS",
  "WIDE-LEG · BAGGY · RELAXED",
];

export default function Marquee({ dark = true }) {
  const row = [...items, ...items];
  return (
    <div
      data-testid="ticker-marquee"
      className={`overflow-hidden border-y ${
        dark ? "bg-ink text-smoke border-white/10" : "bg-smoke text-ink border-line"
      } py-3`}
    >
      <div className="marquee-track animate-marquee">
        {row.map((t, i) => (
          <span key={i} className="label mx-8 inline-flex items-center gap-8">
            {t}
            <span className="opacity-40">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
