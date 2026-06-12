import React, { useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useCartStore } from "../store/cartStore";
import { useAuth } from "../context/AuthContext";
import { useProduct, formatPrice, useWishlist, toggleWishlist } from "../lib/api";
import { Heart, Star } from "lucide-react";

function StarRating({ rating }) {
  return (
    <div className="flex text-yellow-500">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${star <= rating ? "fill-current" : "text-gray-300"}`}
        />
      ))}
    </div>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const colorSlug = searchParams.get("color");
  const { addItem } = useCartStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: product, isLoading, isError } = useProduct(slug);
  const { data: wishlist = [] } = useWishlist(user?.id);

  const isWishlisted = product ? wishlist.includes(product.id) : false;

  const handleWishlistToggle = async () => {
    if (!user) {
      alert("Please log in to add items to your wishlist.");
      return;
    }
    try {
      // Optimistic update
      queryClient.setQueryData(["wishlist", user.id], (old) => {
        if (isWishlisted) return old.filter(id => id !== product.id);
        return [...(old || []), product.id];
      });
      await toggleWishlist(user.id, product.id, isWishlisted);
    } catch (err) {
      console.error(err);
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ["wishlist", user.id] });
    }
  };

  const selectedColor = useMemo(() => {
    if (!product || !product.product_colors) return null;
    if (colorSlug) {
      const match = product.product_colors.find(c => c.color_slug === colorSlug);
      if (match) return match;
    }
    return product.product_colors[0];
  }, [product, colorSlug]);

  if (isLoading) {
    return (
      <div className="pt-28 px-4 sm:px-6 md:px-12 max-w-[1600px] mx-auto min-h-screen flex flex-col md:flex-row gap-10">
        <div className="flex-1 bg-line animate-pulse aspect-[3/4]" />
        <div className="flex-1 space-y-4">
          <div className="h-10 w-3/4 bg-line animate-pulse" />
          <div className="h-6 w-1/4 bg-line animate-pulse" />
          <div className="h-8 w-1/3 bg-line animate-pulse mt-10" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return <div className="pt-28 px-6 text-center text-xl text-red-500">Product not found or failed to load.</div>;
  }

  const displaySubtitle = selectedColor 
    ? `${product.subtitle ? product.subtitle + ' · ' : ''}${selectedColor.color_name}`
    : product.subtitle;

  const displayImage = selectedColor?.images?.[0] || product.images?.[0];

  const availableVariants = useMemo(() => {
    if (!product || !product.product_variants || !selectedColor) return [];
    return product.product_variants
      .filter(v => v.color_id === selectedColor.id && v.is_active)
      .sort((a, b) => (a.sizes?.sort_order || 0) - (b.sizes?.sort_order || 0));
  }, [product, selectedColor]);

  const [selectedVariantId, setSelectedVariantId] = React.useState(null);

  React.useEffect(() => {
    // Auto-select the first available size when the color changes
    if (availableVariants.length > 0) {
      const firstAvailable = availableVariants.find(v => v.available_count > 0);
      setSelectedVariantId(firstAvailable ? firstAvailable.id : availableVariants[0].id);
    } else {
      setSelectedVariantId(null);
    }
  }, [availableVariants]);

  const selectedVariant = useMemo(() => {
    return availableVariants.find(v => v.id === selectedVariantId);
  }, [availableVariants, selectedVariantId]);

  const reviewAgg = product.product_review_aggregates?.[0];
  const reviews = product.reviews || [];

  return (
    <div className="pt-28 px-4 sm:px-6 md:px-12 max-w-[1600px] mx-auto min-h-screen pb-20">
      {/* Product Top Section */}
      <div className="flex flex-col md:flex-row gap-10 mb-20">
        <div className="flex-1 bg-bone aspect-[3/4]" style={{ viewTransitionName: `product-${product.slug}${colorSlug ? `-${colorSlug}` : ''}` }}>
          <img src={displayImage} alt={product.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start mb-2">
            <h1 className="font-serif text-4xl">{product.name}</h1>
            <button 
              onClick={handleWishlistToggle}
              className="p-2 -mr-2 hover:bg-smoke rounded-full transition-colors group"
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart 
                className={`w-7 h-7 transition-colors ${isWishlisted ? "fill-red-500 stroke-red-500" : "stroke-ink group-hover:stroke-gray-600"}`} 
              />
            </button>
          </div>
          <p className="text-ash mb-2">{displaySubtitle}</p>
          
          {/* Rating Snapshot */}
          {reviewAgg && reviewAgg.review_count > 0 && (
            <div className="flex items-center gap-2 mb-6 cursor-pointer hover:opacity-80" onClick={() => document.getElementById('reviews-section').scrollIntoView({ behavior: 'smooth' })}>
              <StarRating rating={Math.round(reviewAgg.average_rating)} />
              <span className="text-sm text-ash underline">{reviewAgg.review_count} Reviews</span>
            </div>
          )}
          {!reviewAgg || reviewAgg.review_count === 0 ? <div className="mb-6 h-6" /> : null}

          <p className="font-sans text-xl mb-10">{formatPrice(product.price)}</p>

          {/* Size Selector */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-sm">Select Size</span>
              <button className="text-xs text-ash underline hover:text-ink">Size Guide</button>
            </div>
            <div className="flex flex-wrap gap-3">
              {availableVariants.map(variant => {
                const isAvailable = variant.available_count > 0;
                const isSelected = selectedVariantId === variant.id;
                
                return (
                  <button
                    key={variant.id}
                    onClick={() => isAvailable && setSelectedVariantId(variant.id)}
                    disabled={!isAvailable}
                    className={`
                      w-14 h-14 flex items-center justify-center border font-medium text-sm transition-all
                      ${isSelected ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink'}
                      ${!isAvailable ? 'opacity-40 cursor-not-allowed bg-smoke line-through text-ash border-line hover:border-line' : ''}
                    `}
                  >
                    {variant.sizes?.label}
                  </button>
                );
              })}
            </div>
            {availableVariants.length === 0 && (
              <p className="text-sm text-red-500 mt-2">No sizes available for this color.</p>
            )}
          </div>

          <button 
            onClick={() => {
              if (selectedVariant && selectedVariant.available_count > 0) {
                addItem(product, selectedVariant.sizes?.label || "M", selectedVariant.id);
              }
            }}
            disabled={!selectedVariant || selectedVariant.available_count <= 0}
            className="bg-ink text-smoke px-8 py-4 label w-full hover:bg-[#262626] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(!selectedVariant || selectedVariant.available_count <= 0) ? "Out of Stock" : "Add to Cart"}
          </button>
        </div>
      </div>

      {/* Reviews Section */}
      <div id="reviews-section" className="border-t border-line pt-16">
        <h2 className="font-serif text-3xl mb-10">Customer Reviews</h2>
        
        {reviews.length === 0 ? (
          <p className="text-ash">No reviews yet. Be the first to review this product!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-8">
              {reviews.map(review => (
                <div key={review.id} className="border-b border-line pb-8">
                  <div className="flex items-center gap-4 mb-2">
                    <StarRating rating={review.rating} />
                    <span className="font-medium text-sm">{review.users?.full_name || "Verified Buyer"}</span>
                    {review.verified_purchase && (
                      <span className="text-xs bg-smoke px-2 py-1 text-ash">Verified</span>
                    )}
                  </div>
                  <p className="text-ink mt-3">{review.comment}</p>
                  <p className="text-xs text-ash mt-4">{new Date(review.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
            <div className="bg-smoke p-8 h-fit sticky top-32 border border-line">
              <h3 className="text-xl mb-4">Overall Rating</h3>
              <div className="flex items-end gap-3 mb-2">
                <span className="text-4xl font-serif">{Number(reviewAgg?.average_rating || 0).toFixed(1)}</span>
                <div className="pb-1">
                  <StarRating rating={Math.round(reviewAgg?.average_rating || 0)} />
                </div>
              </div>
              <p className="text-ash text-sm mb-6">Based on {reviewAgg?.review_count || 0} reviews</p>
              {user ? (
                <button className="bg-ink text-smoke px-6 py-3 text-sm font-medium w-full hover:bg-[#262626] transition-colors">
                  Write a Review
                </button>
              ) : (
                <p className="text-sm text-ash">Log in to write a review.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
