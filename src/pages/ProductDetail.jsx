import React from "react";
import { useParams } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function ProductDetail() {
  const { slug } = useParams();
  const { addItem } = useCart();
  
  const product = {
    slug,
    name: "Classic Baggy Fit",
    subtitle: "Vintage Blue",
    price: 2499,
    images: ["/images/img3.jpeg"]
  };

  return (
    <div className="pt-28 px-4 sm:px-6 md:px-12 max-w-[1600px] mx-auto min-h-screen flex flex-col md:flex-row gap-10">
      <div className="flex-1 bg-bone aspect-[3/4]">
        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1">
        <h1 className="font-serif text-4xl mb-2">{product.name}</h1>
        <p className="text-ash mb-6">{product.subtitle}</p>
        <p className="font-sans text-xl mb-10">₹2,499</p>
        <button 
          onClick={() => addItem(product, "M")}
          className="bg-ink text-smoke px-8 py-4 label w-full hover:bg-[#262626] transition-colors"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
