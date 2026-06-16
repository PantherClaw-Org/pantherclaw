import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ProductCard from "../components/ProductCard";
import { useProducts } from "../lib/api";

const SORTS = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
};

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category");
  const sort = searchParams.get("sort") || "featured";
  const maxPrice = searchParams.get("maxPrice");
  const { data: products, isLoading, isError } = useProducts(category);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const visibleProducts = useMemo(() => {
    if (!products) return [];
    let list = [...products];
    if (maxPrice) {
      const cap = Number(maxPrice);
      if (!Number.isNaN(cap)) list = list.filter((p) => p.price <= cap);
    }
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        list.sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
        );
        break;
      default:
        break;
    }
    return list;
  }, [products, sort, maxPrice]);

  const title = category
    ? `${category} | Pantherclaw`
    : "Shop All | Pantherclaw";
  const baseUrl = import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://pantherclaw.in');
  const canonical =
    baseUrl + "/shop" + (category ? "?category=" + category : "");

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Shop",
        "item": `${baseUrl}/shop`
      }
    ]
  };
  
  if (category) {
    breadcrumbLd.itemListElement.push({
      "@type": "ListItem",
      "position": 3,
      "name": category,
      "item": `${baseUrl}/shop?category=${encodeURIComponent(category)}`
    });
  }

  return (
    <div className="pt-32 px-4 sm:px-6 md:px-12 max-w-[1600px] mx-auto min-h-screen flex flex-col">
      <Helmet>
        <title>{title}</title>
        <meta
          name="description"
          content={`Shop ${category ? category + " " : ""}premium baggy and wide-leg denim from Pantherclaw. Engineered in India for those who move different.`}
        />
        <link rel="canonical" href={canonical} />
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
      </Helmet>

      {/* Header and Filters Row */}
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between border-b border-white/10 pb-6">
        <h1 className="font-serif text-5xl">
          {category ? category : "Shop All"}
        </h1>
        
        <div className="flex flex-wrap items-center gap-4 md:gap-8">
          <label className="flex items-center gap-3 text-xs text-white group cursor-pointer">
            <span className="uppercase tracking-[0.2em] font-bold text-white/50 group-hover:text-white transition-colors">Sort</span>
            <select
              value={sort}
              onChange={(e) =>
                updateParam(
                  "sort",
                  e.target.value === "featured" ? "" : e.target.value,
                )
              }
              className="bg-transparent border-b border-white/20 pb-1 text-white focus:outline-none focus:border-white transition-colors font-serif italic cursor-pointer appearance-none pr-4"
            >
              {Object.entries(SORTS).map(([value, label]) => (
                <option
                  key={value}
                  value={value}
                  className="bg-[#111] text-white not-italic font-sans"
                >
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-3 text-xs text-white group cursor-text">
            <span className="uppercase tracking-[0.2em] font-bold text-white/50 group-hover:text-white transition-colors">Max Price</span>
            <input
              type="number"
              placeholder="₹..."
              value={maxPrice || ""}
              onChange={(e) => updateParam("maxPrice", e.target.value)}
              className="w-20 bg-transparent border-b border-white/20 pb-1 text-white placeholder:text-white/20 focus:outline-none focus:border-white transition-colors font-serif italic"
            />
          </label>
        </div>
      </div>

      {/* Grid Mosaic */}
      <div className="flex-1 w-full bg-black">
        {isLoading ? (
          <div className="py-32 text-center text-white/50 uppercase tracking-widest font-bold text-sm">
            Loading collection...
          </div>
        ) : isError ? (
          <div className="py-32 text-center text-red-500 uppercase tracking-widest font-bold text-sm">
            Failed to load products.
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="py-32 text-center text-white/50 uppercase tracking-widest font-bold text-sm">
            No products found matching criteria.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12 pt-8">
            {visibleProducts.flatMap((p) =>
              p.product_colors && p.product_colors.length > 0
                ? p.product_colors.map((color) => ({
                    ...p,
                    color_slug: color.color_slug,
                    images: color.images,
                    subtitle: `${p.subtitle ? p.subtitle + " · " : ""}${color.color_name}`,
                    product_colors: [color],
                    key: `${p.id}-${color.id}`,
                  }))
                : [{ ...p, key: p.slug || p.id }]
            ).map((p, i) => (
              <ProductCard key={p.key} product={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
