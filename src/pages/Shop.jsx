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

  return (
    <div className="pt-28 px-4 sm:px-6 md:px-12 max-w-[1600px] mx-auto min-h-screen">
      <Helmet>
        <title>{title}</title>
        <meta
          name="description"
          content={`Shop ${category ? category + " " : ""}premium baggy and wide-leg denim from Pantherclaw. Engineered in India for those who move different.`}
        />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="font-serif text-5xl">
          {category ? category : "Shop All"}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-ash">
            <span className="uppercase tracking-[0.18em]">Sort</span>
            <select
              value={sort}
              onChange={(e) =>
                updateParam(
                  "sort",
                  e.target.value === "featured" ? "" : e.target.value,
                )
              }
              className="border border-white/10 bg-transparent px-3 py-2 text-sm text-smoke focus:border-smoke focus:outline-none"
            >
              {Object.entries(SORTS).map(([value, label]) => (
                <option
                  key={value}
                  value={value}
                  className="bg-[#111] text-smoke"
                >
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-ash">
            <span className="uppercase tracking-[0.18em]">Max Price</span>
            <select
              value={maxPrice || ""}
              onChange={(e) => updateParam("maxPrice", e.target.value)}
              className="border border-white/10 bg-transparent px-3 py-2 text-sm text-smoke focus:border-smoke focus:outline-none"
            >
              <option value="" className="bg-[#111] text-smoke">
                All
              </option>
              <option value="200000" className="bg-[#111] text-smoke">
                Under \u20b92,000
              </option>
              <option value="350000" className="bg-[#111] text-smoke">
                Under \u20b93,500
              </option>
              <option value="500000" className="bg-[#111] text-smoke">
                Under \u20b95,000
              </option>
            </select>
          </label>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse flex flex-col gap-4">
              <div className="bg-white/10 aspect-[3/4] w-full" />
              <div className="h-4 bg-white/10 w-2/3" />
              <div className="h-4 bg-white/10 w-1/3" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="text-red-500 py-10">
          Failed to load products. Please try again.
        </div>
      )}

      {!isLoading && !isError && visibleProducts.length === 0 && (
        <div className="py-10 text-ash">No products found.</div>
      )}

      {!isLoading && !isError && visibleProducts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {visibleProducts.flatMap((p) =>
            p.product_colors && p.product_colors.length > 0 ? (
              p.product_colors.map((color) => (
                <ProductCard
                  key={`${p.id}-${color.id}`}
                  product={{
                    ...p,
                    color_slug: color.color_slug,
                    images: color.images,
                    subtitle: `${p.subtitle ? p.subtitle + " \u00b7 " : ""}${color.color_name}`,
                    product_colors: [color],
                  }}
                />
              ))
            ) : (
              <ProductCard key={p.slug || p.id} product={p} />
            ),
          )}
        </div>
      )}
    </div>
  );
}
