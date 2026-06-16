import React, { useMemo, useState, useEffect } from "react";
import {
  useParams,
  useSearchParams,
  useNavigate,
  Link,
} from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { trackViewItem } from "../lib/analytics";
import Img from "../components/Img";
import ProductCard from "../components/ProductCard";
import { recordRecentlyViewed, getRecentlyViewed } from "../lib/recentlyViewed";
import { useCartStore } from "../store/cartStore";
import { useAuth } from "../context/AuthContext";
import {
  useProduct,
  useRelatedProducts,
  formatPrice,
  useWishlist,
  toggleWishlist,
  submitReview,
  uploadReviewPhotos,
  useCanReview,
} from "../lib/api";
import { gallery, badgeLabel, fitLabel, pricing } from "../lib/productMedia";
import { Heart, Star, Loader2, X, ImagePlus } from "lucide-react";

function StarRating({ rating, interactive = false, onRate }) {
  return (
    <div
      className={`flex text-yellow-500 ${interactive ? "cursor-pointer" : ""}`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          onClick={interactive ? () => onRate?.(star) : undefined}
          className={`w-4 h-4 ${star <= rating ? "fill-current" : "text-gray-300"}`}
        />
      ))}
    </div>
  );
}

function ReviewForm({ productId, userId, onDone }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    setError(null);
    const valid = picked.filter(
      (f) => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024 && !files.some(existing => existing.name === f.name && existing.size === f.size),
    );
    if (valid.length < picked.length) {
      setError("Photos must be images under 5MB and not already added.");
    }
    setFiles((prev) => [...prev, ...valid].slice(0, 5));
    e.target.value = "";
  };

  const removeFile = (idx) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      let imageUrls = [];
      if (files.length) {
        imageUrls = await uploadReviewPhotos(userId, productId, files);
      }
      await submitReview(productId, rating, comment, imageUrls);
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-ash">Your rating:</span>
        <StarRating rating={rating} interactive onRate={setRating} />
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Share your thoughts…"
        aria-label="Your review"
        className="w-full border border-white/10 p-3 text-sm bg-transparent"
      />

      {/* Photo upload (optional, up to 5) */}
      <div>
        <div className="flex flex-wrap gap-2">
          {files.map((file, i) => (
            <div key={i} className="relative h-16 w-16">
              <img
                src={URL.createObjectURL(file)}
                alt={`Selected photo ${i + 1}`}
                className="h-16 w-16 object-cover border border-white/10"
              />
              <button
                type="button"
                onClick={() => removeFile(i)}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute -right-2 -top-2 rounded-full bg-smoke p-0.5 text-black"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {files.length < 5 && (
            <label className="flex h-16 w-16 cursor-pointer items-center justify-center border border-dashed border-white/10 text-ash hover:border-smoke hover:text-smoke">
              <ImagePlus className="h-5 w-5" />
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFiles}
                className="hidden"
                aria-label="Add review photos"
              />
            </label>
          )}
        </div>
        <p className="mt-1 text-xs text-ash">Add up to 5 photos (optional).</p>
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="bg-smoke text-black px-6 py-3 text-sm font-medium w-full hover:bg-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          "Submit Review"
        )}
      </button>
    </form>
  );
}

function SizeGuideModal({ onClose }) {
  const dialogRef = React.useRef(null);
  
  React.useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const rows = [
    ["28", "28", "38", "30"],
    ["30", "30", "40", "30"],
    ["32", "32", "42", "31"],
    ["34", "34", "44", "31"],
    ["36", "36", "46", "32"],
    ["38", "38", "48", "32"],
    ["40", "40", "50", "33"],
  ];
  
  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto backdrop:bg-black/70 bg-[#111] p-6 max-w-md w-full border border-white/10 text-white"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close size guide"
          className="absolute right-4 top-4 text-ash hover:text-smoke"
        >
          <X size={18} />
        </button>
        <h3 className="font-serif text-2xl mb-1">Size Guide</h3>
        <p className="text-xs text-ash mb-5">
          All measurements in inches. Our denim is true to size.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-ash">
              <th className="py-2 font-medium">Size</th>
              <th className="py-2 font-medium">Waist</th>
              <th className="py-2 font-medium">Hip</th>
              <th className="py-2 font-medium">Inseam</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]} className="border-b border-white/5">
                <td className="py-2 font-medium">{r[0]}</td>
                <td className="py-2 text-ash">{r[1]}</td>
                <td className="py-2 text-ash">{r[2]}</td>
                <td className="py-2 text-ash">{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </dialog>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const colorSlug = searchParams.get("color");
  const { addItem } = useCartStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: product, isLoading, isError } = useProduct(slug);
  const { data: wishlist = [] } = useWishlist(user?.id);
  const { data: canReview = false } = useCanReview(user?.id, product?.id);
  const { data: relatedProducts = [] } = useRelatedProducts(
    product?.categories?.slug,
    product?.id,
  );
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  // All hooks run unconditionally, BEFORE any early return (Rules of Hooks).
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedShot, setSelectedShot] = useState(0);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const isWishlisted = product ? wishlist.includes(product.id) : false;

  const selectedColor = useMemo(() => {
    if (!product || !product.product_colors) return null;
    if (colorSlug) {
      const match = product.product_colors.find(
        (c) => c.color_slug === colorSlug,
      );
      if (match) return match;
    }
    return product.product_colors[0];
  }, [product, colorSlug]);

  const availableVariants = useMemo(() => {
    if (!product || !product.product_variants || !selectedColor) return [];
    return product.product_variants
      .filter((v) => v.color_id === selectedColor.id && v.is_active)
      .sort((a, b) => (a.sizes?.sort_order || 0) - (b.sizes?.sort_order || 0));
  }, [product, selectedColor]);

  useEffect(() => {
    if (availableVariants.length > 0) {
      const firstAvailable = availableVariants.find(
        (v) => v.available_count > 0,
      );
      setSelectedVariantId(
        firstAvailable ? firstAvailable.id : availableVariants[0].id,
      );
    } else {
      setSelectedVariantId(null);
    }
  }, [availableVariants]);

  const selectedVariant = useMemo(
    () => availableVariants.find((v) => v.id === selectedVariantId),
    [availableVariants, selectedVariantId],
  );

  // Reset the active gallery image whenever the colour changes.
  useEffect(() => {
    setSelectedShot(0);
  }, [selectedColor?.id]);

  useEffect(() => {
    if (product?.id) {
      trackViewItem({
        id: product.id,
        name: product.name,
        price: (product.price || 0) / 100,
      });
      // Snapshot the prior list BEFORE recording the current product, so the
      // strip shows other items rather than the one being viewed.
      setRecentlyViewed(
        getRecentlyViewed().filter((p) => p.slug !== product.slug),
      );
      recordRecentlyViewed(product);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const handleWishlistToggle = async () => {
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

  if (isLoading) {
    return (
      <div className="pt-28 px-4 sm:px-6 md:px-12 max-w-[1600px] mx-auto min-h-screen flex flex-col md:flex-row gap-10">
        <div className="flex-1 bg-white/10 animate-pulse aspect-[3/4]" />
        <div className="flex-1 space-y-4">
          <div className="h-10 w-3/4 bg-white/10 animate-pulse" />
          <div className="h-6 w-1/4 bg-white/10 animate-pulse" />
          <div className="h-8 w-1/3 bg-white/10 animate-pulse mt-10" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="pt-28 px-6 text-center text-xl text-red-500">
        Product not found or failed to load.
      </div>
    );
  }

  const displaySubtitle = selectedColor
    ? `${product.subtitle ? product.subtitle + " · " : ""}${selectedColor.color_name}`
    : product.subtitle;

  // Full normalised gallery (product_images + legacy fallback) for this colour.
  const shots = gallery(product, selectedColor);
  const heroImage = shots[selectedShot] || shots[0] || null;
  const displayImage =
    heroImage?.url || selectedColor?.images?.[0] || product.images?.[0];
  const badge = badgeLabel(product);
  const fit = fitLabel(product);
  const { hasDiscount, mrp, percentOff, savings } = pricing(product);

  const reviewAgg = product.product_review_aggregates?.[0];
  const reviews = product.reviews || [];

  const anyInStock = product.product_variants?.some(
    (v) => (v.available_count ?? v.inventory_count ?? 0) > 0,
  );
  
  const baseUrl = import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://pantherclaw.in');
  
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.subtitle || product.name,
    image: shots.length
      ? shots.map((s) => s.url)
      : [displayImage].filter(Boolean),
    sku: product.sku || product.id,
    brand: { "@type": "Brand", name: "PANTHERCLAW" },
    offers: {
      "@type": "Offer",
      priceCurrency: product.currency || "INR",
      price: ((product.price || 0) / 100).toFixed(2),
      availability: anyInStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${baseUrl}/product/${product.slug}`,
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": "IN",
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
        "merchantReturnDays": "5",
        "returnMethod": "https://schema.org/ReturnByMail",
        "returnFees": "https://schema.org/FreeReturn"
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        "shippingRate": {
          "@type": "MonetaryAmount",
          "value": "150",
          "currency": "INR"
        },
        "shippingDestination": {
          "@type": "DefinedRegion",
          "addressCountry": "IN"
        },
        "deliveryTime": {
          "@type": "ShippingDeliveryTime",
          "handlingTime": { "@type": "QuantitativeValue", "minValue": 1, "maxValue": 2, "unitCode": "d" },
          "transitTime": { "@type": "QuantitativeValue", "minValue": 2, "maxValue": 7, "unitCode": "d" }
        }
      }
    },
    ...(reviewAgg && reviewAgg.review_count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: reviewAgg.average_rating,
            reviewCount: reviewAgg.review_count,
          },
        }
      : {}),
  };

  const categoryName = product.categories?.name || "Shop";
  const categorySlug = product.categories?.slug || "";
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": baseUrl },
      { "@type": "ListItem", "position": 2, "name": "Shop", "item": `${baseUrl}/shop` },
      { "@type": "ListItem", "position": 3, "name": categoryName, "item": `${baseUrl}/shop${categorySlug ? '?category=' + encodeURIComponent(categorySlug) : ''}` },
      { "@type": "ListItem", "position": 4, "name": product.name, "item": `${baseUrl}/product/${product.slug}` }
    ]
  };

  const refreshReviews = () => {
    setShowReviewForm(false);
    queryClient.invalidateQueries({ queryKey: ["product", slug] });
    queryClient.invalidateQueries({
      queryKey: ["can_review", user?.id, product.id],
    });
  };

  return (
    <div className="pt-28 px-4 sm:px-6 md:px-12 max-w-[1600px] mx-auto min-h-screen pb-20">
      <Helmet>
        <title>{`${product.name} — PANTHERCLAW`}</title>
        <meta name="description" content={product.subtitle || product.name} />
        <meta property="og:title" content={`${product.name} — PANTHERCLAW`} />
        {displayImage && <meta property="og:image" content={displayImage} />}
        <meta property="og:type" content="product" />
        <link
          rel="canonical"
          href={`${baseUrl}/product/${product.slug}`}
        />
        <script type="application/ld+json">{JSON.stringify(productLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
      </Helmet>

      {/* Product Top Section */}
      <div className="flex flex-col md:flex-row gap-10 mb-20 md:items-start">
        {/* Left: Images (Stacked Desktop, Swipe Mobile) */}
        <div className="w-full md:flex-[1.5] lg:flex-[2]">
          {/* Mobile: Horizontal Snap Scroll */}
          <div className="flex md:hidden overflow-x-auto snap-x snap-mandatory gap-2 pb-4 hide-scrollbar">
            {shots.length > 0 ? (
              shots.map((shot, i) => (
                <div
                  key={`mob-${i}`}
                  className="w-[90vw] flex-shrink-0 snap-center bg-[#111]"
                  style={i === 0 ? { viewTransitionName: `product-${product.slug}${colorSlug ? `-${colorSlug}` : ""}` } : {}}
                >
                  <Img
                    src={shot.url}
                    alt={(shot.alt || product.name) + " — Premium Pantherclaw Denim"}
                    blurhash={shot.blurhash}
                    className="w-full h-auto"
                    sizes="100vw"
                    eager={i === 0}
                  />
                </div>
              ))
            ) : (
              <div className="w-[90vw] flex-shrink-0 snap-center bg-[#111]">
                <Img src={displayImage} alt={product.name + " — Premium Pantherclaw Denim"} className="w-full h-auto" sizes="100vw" eager />
              </div>
            )}
          </div>

          {/* Desktop: Vertical Stack */}
          <div className="hidden md:flex flex-col gap-4">
            {shots.length > 0 ? (
              shots.map((shot, i) => (
                <div
                  key={`desk-${i}`}
                  className="w-full bg-[#111]"
                  style={i === 0 ? { viewTransitionName: `product-${product.slug}${colorSlug ? `-${colorSlug}` : ""}` } : {}}
                >
                  <Img
                    src={shot.url}
                    alt={(shot.alt || product.name) + " — Premium Pantherclaw Denim"}
                    blurhash={shot.blurhash}
                    className="w-full h-auto"
                    sizes="50vw"
                    eager={i === 0}
                  />
                </div>
              ))
            ) : (
              <div className="w-full bg-[#111]">
                <Img src={displayImage} alt={product.name + " — Premium Pantherclaw Denim"} className="w-full h-auto" sizes="50vw" eager />
              </div>
            )}
          </div>
        </div>

        {/* Right: Sticky Details */}
        <div className="w-full md:flex-1 md:sticky md:top-32 h-fit">
          <div className="flex justify-between items-start mb-2">
            <h1 className="font-serif text-4xl">{product.name}</h1>
            <button
              onClick={handleWishlistToggle}
              className="p-2 -mr-2 hover:bg-white/5 rounded-full transition-colors group"
              aria-label={
                isWishlisted ? "Remove from wishlist" : "Add to wishlist"
              }
            >
              <Heart
                className={`w-7 h-7 transition-colors ${
                  isWishlisted
                    ? "fill-red-500 stroke-red-500"
                    : "stroke-smoke group-hover:stroke-ash"
                }`}
              />
            </button>
          </div>
          {(badge || fit) && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {badge && (
                <span className="label bg-smoke px-2.5 py-1 text-[0.6rem] text-black">
                  {badge}
                </span>
              )}
              {fit && <span className="text-xs text-ash">{fit}</span>}
            </div>
          )}
          <p className="text-ash mb-2">{displaySubtitle}</p>

          {reviewAgg && reviewAgg.review_count > 0 ? (
            <div
              className="flex items-center gap-2 mb-6 cursor-pointer hover:opacity-80"
              onClick={() =>
                document
                  .getElementById("reviews-section")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <StarRating rating={Math.round(reviewAgg.average_rating)} />
              <span className="text-sm text-ash underline">
                {reviewAgg.review_count} Reviews
              </span>
            </div>
          ) : (
            <div className="mb-6 h-6" />
          )}

          <div className="mb-10">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-sans text-xl">
                {formatPrice(product.price)}
              </span>
              {hasDiscount && (
                <>
                  <span className="font-sans text-base text-ash line-through">
                    {formatPrice(mrp)}
                  </span>
                  <span className="font-sans text-sm font-medium text-red-600">
                    Save {formatPrice(savings)} ({percentOff}%)
                  </span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-ash">Inclusive of all taxes</p>
          </div>

          {/* Colour Selector */}
          {product.product_colors && product.product_colors.length > 1 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-sm">
                  Colour:{" "}
                  <span className="text-ash">{selectedColor?.color_name}</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {product.product_colors.map((color) => {
                  const swatch =
                    gallery(product, color)[0]?.url || color.images?.[0];
                  const isSel = selectedColor?.id === color.id;
                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => {
                        const next = new URLSearchParams(searchParams);
                        next.set("color", color.color_slug);
                        setSearchParams(next, { replace: true });
                      }}
                      aria-label={color.color_name}
                      aria-pressed={isSel}
                      title={color.color_name}
                      className={`relative h-16 w-14 overflow-hidden border transition-colors ${
                        isSel
                          ? "border-smoke"
                          : "border-white/10 hover:border-ash"
                      }`}
                    >
                      {swatch ? (
                        <img
                          src={swatch}
                          alt={color.color_name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center px-1 text-center text-[0.6rem] leading-tight text-ash">
                          {color.color_name}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Selector */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-sm">Select Size</span>
              <button
                type="button"
                onClick={() => setShowSizeGuide(true)}
                className="text-xs text-ash underline hover:text-smoke"
              >
                Size Guide
              </button>
            </div>
            {showSizeGuide && (
              <SizeGuideModal onClose={() => setShowSizeGuide(false)} />
            )}
            <div className="flex flex-wrap gap-3">
              {availableVariants.map((variant) => {
                const isAvailable = variant.available_count > 0;
                const isSelected = selectedVariantId === variant.id;
                return (
                  <button
                    key={variant.id}
                    onClick={() =>
                      isAvailable && setSelectedVariantId(variant.id)
                    }
                    disabled={!isAvailable}
                    className={`w-14 h-14 flex items-center justify-center border font-medium text-sm transition-all ${
                      isSelected
                        ? "border-smoke bg-smoke text-black"
                        : "border-white/10 hover:border-smoke"
                    } ${
                      !isAvailable
                        ? "opacity-40 cursor-not-allowed bg-white/5 line-through text-ash border-white/10 hover:border-white/10"
                        : ""
                    }`}
                  >
                    {variant.sizes?.label}
                  </button>
                );
              })}
            </div>
            {availableVariants.length === 0 && (
              <p className="text-sm text-red-500 mt-2">
                No sizes available for this color.
              </p>
            )}
          </div>

          {selectedVariant &&
            selectedVariant.available_count > 0 &&
            selectedVariant.available_count <= 5 && (
              <p className="mb-4 text-sm text-amber-400">
                Only {selectedVariant.available_count} left — order soon.
              </p>
            )}

          <button
            onClick={() => {
              if (selectedVariant && selectedVariant.available_count > 0) {
                const colorImage = gallery(product, selectedColor)[0]?.url || selectedColor?.images?.[0] || product.images?.[0];
                const itemSubtitle = selectedColor ? `${product.subtitle ? product.subtitle + " · " : ""}${selectedColor.color_name}` : product.subtitle;
                addItem(
                  product,
                  selectedVariant.sizes?.label || "M",
                  selectedVariant.id,
                  colorImage,
                  itemSubtitle
                );
              }
            }}
            disabled={!selectedVariant || selectedVariant.available_count <= 0}
            className="bg-smoke text-black px-8 py-4 label w-full hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!selectedVariant || selectedVariant.available_count <= 0
              ? "Out of Stock"
              : "Add to Cart"}
          </button>
        </div>
      </div>

      {/* You May Also Like */}
      {relatedProducts.length > 0 && (
        <div className="border-t border-white/10 pt-16 mb-20">
          <h2 className="font-serif text-3xl mb-10">You May Also Like</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
            {relatedProducts.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <div className="border-t border-white/10 pt-16 mb-20">
          <h2 className="font-serif text-3xl mb-10">Recently Viewed</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
            {recentlyViewed.map((p) => (
              <Link
                key={p.slug}
                to={`/product/${p.slug}`}
                className="group block"
                data-testid={`recent-${p.slug}`}
              >
                <div className="aspect-[3/4] overflow-hidden bg-[#111]">
                  <Img
                    src={p.image}
                    alt={p.name}
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <p className="mt-3 text-sm">{p.name}</p>
                <p className="text-xs text-ash">{formatPrice(p.price)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <div id="reviews-section" className="border-t border-white/10 pt-16">
        <h2 className="font-serif text-3xl mb-10">Customer Reviews</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Left: list of reviews */}
          <div className="space-y-8">
            {reviews.length === 0 ? (
              <p className="text-ash">
                No reviews yet. Be the first to review this product!
              </p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="border-b border-white/10 pb-8">
                  <div className="flex items-center gap-4 mb-2">
                    <StarRating rating={review.rating} />
                    <span className="font-medium text-sm">
                      {review.users?.full_name || "Verified Buyer"}
                    </span>
                    {review.verified_purchase && (
                      <span className="text-xs bg-white/10 px-2 py-1 text-ash">
                        Verified
                      </span>
                    )}
                  </div>
                  {review.comment && (
                    <p className="text-smoke mt-3">{review.comment}</p>
                  )}
                  {review.images?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {review.images.map((src, i) => (
                        <a
                          key={i}
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open review photo ${i + 1}`}
                        >
                          <img
                            src={src}
                            alt={`Photo ${i + 1} from ${review.users?.full_name || "a verified buyer"}'s review`}
                            loading="lazy"
                            className="h-20 w-20 object-cover border border-white/10 bg-[#111]"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-ash mt-4">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Right: aggregate + write a review */}
          <div className="bg-[#111] p-8 h-fit sticky top-32 border border-white/10">
            <h3 className="text-xl mb-4">Overall Rating</h3>
            <div className="flex items-end gap-3 mb-2">
              <span className="text-4xl font-serif">
                {Number(reviewAgg?.average_rating || 0).toFixed(1)}
              </span>
              <div className="pb-1">
                <StarRating
                  rating={Math.round(reviewAgg?.average_rating || 0)}
                />
              </div>
            </div>
            <p className="text-ash text-sm mb-6">
              Based on {reviewAgg?.review_count || 0} reviews
            </p>

            {!user ? (
              <p className="text-sm text-ash">Log in to write a review.</p>
            ) : canReview ? (
              showReviewForm ? (
                <ReviewForm
                  productId={product.id}
                  userId={user.id}
                  onDone={refreshReviews}
                />
              ) : (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="bg-smoke text-black px-6 py-3 text-sm font-medium w-full hover:bg-white transition-colors"
                >
                  Write a Review
                </button>
              )
            ) : (
              <p className="text-sm text-ash">
                Only verified purchasers can review this product.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
