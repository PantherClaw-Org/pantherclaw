import React, { useState } from "react";
import ProductCard from "../components/ProductCard";

export default function Shop() {
  const [products] = useState([
    {
      slug: "baggy-denim-01",
      name: "Classic Baggy Fit",
      subtitle: "Vintage Blue",
      fit: "Relaxed",
      price: 2499,
      images: ["/images/img3.jpeg", "/images/img4.jpeg"],
      badge: "Bestseller"
    },
    {
      slug: "wide-leg-02",
      name: "Wide Leg Essential",
      subtitle: "Washed Black",
      fit: "Wide",
      price: 2799,
      images: ["/images/img1.jpeg", "/images/img2.jpeg"]
    }
  ]);

  return (
    <div className="pt-28 px-4 sm:px-6 md:px-12 max-w-[1600px] mx-auto min-h-screen">
      <h1 className="font-serif text-5xl mb-10">Shop All</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {products.map(p => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </div>
  );
}
