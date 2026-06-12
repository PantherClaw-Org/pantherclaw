import React from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { formatPrice, useWishlist, toggleWishlist } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Heart } from "lucide-react";

export default function ProductCard({ product, index = 0 }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: wishlist = [] } = useWishlist(user?.id);

  const isWishlisted = product ? wishlist.includes(product.id) : false;

  const handleWishlistToggle = async (e) => {
    e.preventDefault(); // Prevent navigating to the product page
    e.stopPropagation();
    
    if (!user) {
      alert("Please log in to add items to your wishlist.");
      return;
    }
    try {
      queryClient.setQueryData(["wishlist", user.id], (old) => {
        if (isWishlisted) return old.filter(id => id !== product.id);
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
      to={`/product/${product.slug}${product.color_slug ? `?color=${product.color_slug}` : ''}`}
      data-testid={`product-card-${product.slug}`}
      className="group block relative"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-bone" style={{ viewTransitionName: `product-${product.slug}${product.color_slug ? `-${product.color_slug}` : ''}` }}>
        <img
          src={product.images?.[0] || product.product_colors?.[0]?.images?.[0]}
          alt={product.name}
          loading="lazy"
          className="img-zoom h-full w-full object-cover"
        />
        {(product.images?.[1] || product.product_colors?.[0]?.images?.[1]) && (
          <img
            src={product.images?.[1] || product.product_colors?.[0]?.images?.[1]}
            alt={`${product.name} alternate`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
          />
        )}
        {product.badge && (
          <span className="label absolute left-4 top-4 bg-ink px-3 py-1.5 text-[0.6rem] text-smoke">
            {product.badge}
          </span>
        )}
        <span className="label absolute bottom-4 left-1/2 -translate-x-1/2 translate-y-4 whitespace-nowrap bg-smoke px-5 py-2.5 text-[0.62rem] text-ink opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          View Product
        </span>
        
        <button 
          onClick={handleWishlistToggle}
          className="absolute top-4 right-4 z-20 p-2 bg-white/70 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white"
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart 
            className={`w-4 h-4 transition-colors ${isWishlisted ? "fill-red-500 stroke-red-500" : "stroke-ink"}`} 
          />
        </button>
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-sans text-sm font-semibold tracking-tight">{product.name}</h3>
          <p className="mt-0.5 text-xs text-ash">{product.subtitle} · {product.fit}</p>
        </div>
        <span className="font-sans text-sm font-medium">{formatPrice(product.price)}</span>
      </div>
    </Link>
  );
}
