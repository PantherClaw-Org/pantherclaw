import React from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { formatPrice, useWishlist, toggleWishlist } from "../lib/api";
import { gallery, badgeLabel, fitLabel, pricing } from "../lib/productMedia";
import { useAuth } from "../context/AuthContext";
import { Heart } from "lucide-react";
import Img from "./Img";

export default function ProductCard({ product, index = 0 }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: wishlist = [] } = useWishlist(user?.id);

  const isWishlisted = product ? wishlist.includes(product.id) : false;

  // Resolved media + pricing using the full set of DB fields. When this card
  // represents a specific colour (e.g. the Shop grid), scope the gallery to
  // that colour so it shows the colour's own first image, in order.
  const cardColor =
    product.color_slug && Array.isArray(product.product_colors)
      ? product.product_colors.find(
          (c) => c.color_slug === product.color_slug,
        ) || null
      : null;
  const shots = gallery(product, cardColor);
  const primary = shots[0] || null;
  const secondary = shots[1] || null;
  const badge = badgeLabel(product);
  const fit = fitLabel(product);
  const { hasDiscount, mrp, percentOff } = pricing(product);

  const handleWishlistToggle = async (e) => {
    e.preventDefault(); // Prevent navigating to the product page
    e.stopPropagation();

    if (!user) {
      alert("Please log in to add items to your wishlist.");
      return;
    }
    try {
      queryClient.setQueryData(["wishlist", user.id], (old) => {
        if (isWishlisted) return (old || []).filter((id) => id !== product.id);
        return [...(old || []), product.id];
      });
      await toggleWishlist(user.id, product.id, isWishlisted);
    } catch (err) {
      console.error(err);
      queryClient.invalidateQueries({ queryKey: ["wishlist", user.id] });
    }
  };

  return (
    <Link
      to={`/product/${product.slug}${product.color_slug ? `?color=${product.color_slug}` : ""}`}
      data-testid={`product-card-${product.slug}`}
      className="group block relative"
    >
      <div
        className="relative aspect-[3/4] overflow-hidden bg-[#111]"
        style={{
          viewTransitionName: `product-${product.slug}${product.color_slug ? `-${product.color_slug}` : ""}`,
        }}
      >
        <Img
          src={primary?.url}
          alt={primary?.alt || product.name}
          blurhash={primary?.blurhash}
          sizes="(max-width: 768px) 50vw, 25vw"
          className="h-full w-full object-cover"
        />

        <div className="absolute left-4 top-4 flex flex-col items-start gap-1.5">
          {badge && (
            <span className="label bg-ink px-3 py-1.5 text-[0.6rem] text-smoke">
              {badge}
            </span>
          )}
          {hasDiscount && (
            <span className="label bg-red-600 px-3 py-1.5 text-[0.6rem] text-white">
              {percentOff}% Off
            </span>
          )}
        </div>
        <span className="label absolute bottom-4 left-1/2 -translate-x-1/2 translate-y-4 whitespace-nowrap bg-smoke px-5 py-2.5 text-[0.62rem] text-ink opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          View Product
        </span>

        <button
          onClick={handleWishlistToggle}
          className="absolute top-4 right-4 z-20 p-2 bg-white/70 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white"
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            className={`w-4 h-4 transition-colors ${isWishlisted ? "fill-red-500 stroke-red-500" : "stroke-smoke"}`}
          />
        </button>
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-sans text-sm font-semibold tracking-tight">
            {product.name}
          </h3>
          <p className="mt-0.5 text-xs text-ash">
            {[product.subtitle, fit].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="text-right">
          <span className="font-sans text-sm font-medium">
            {formatPrice(product.price)}
          </span>
          {hasDiscount && (
            <span className="ml-1.5 font-sans text-xs text-ash line-through">
              {formatPrice(mrp)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
