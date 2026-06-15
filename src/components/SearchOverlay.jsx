import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { X, Search } from "lucide-react";
import { useProducts, formatPrice } from "../lib/api";
import { primaryImage } from "../lib/productMedia";
import Img from "./Img";

// Full-screen instant search. Loads the active catalogue once (shared with the
// rest of the app via react-query cache) and filters client-side, so results
// are instant and work offline.
export default function SearchOverlay({ open, onClose }) {
  const [q, setQ] = useState("");
  // Only load the full catalogue once the overlay is actually opened, so pages
  // that never use search don't pay for the catalogue fetch.
  const { data: products = [] } = useProducts(null, { enabled: open });

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return products
      .filter((p) => {
        // categories can be embedded as an array or an object depending on
        // the PostgREST relationship, so normalise before reading name.
        const cat = Array.isArray(p.categories)
          ? p.categories[0]
          : p.categories;
        const hay =
          `${p.name || ""} ${p.subtitle || ""} ${cat?.name || ""}`.toLowerCase();
        return hay.includes(term);
      })
      .slice(0, 12);
  }, [q, products]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-black/95 text-smoke"
      data-testid="search-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Product search"
    >
      <div className="mx-auto flex max-w-[1100px] flex-col px-4 py-6 sm:px-6 md:px-12">
        <div className="flex items-center gap-4 border-b border-white/20 pb-4">
          <Search size={22} strokeWidth={1.6} aria-hidden="true" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for products..."
            aria-label="Search for products"
            data-testid="search-input"
            className="w-full bg-transparent text-xl placeholder:text-white/40 focus:outline-none"
          />
          <button
            onClick={onClose}
            aria-label="Close search"
            data-testid="search-close"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mt-8 pb-16">
          {q.trim() === "" ? (
            <p className="text-white/50">
              Start typing to search the collection.
            </p>
          ) : results.length === 0 ? (
            <p className="text-white/50" data-testid="search-empty">
              No products match “{q}”.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
              {results.map((p) => (
                <Link
                  key={p.id}
                  to={`/product/${p.slug}`}
                  onClick={onClose}
                  data-testid={`search-result-${p.slug}`}
                  className="group block"
                >
                  <div className="aspect-[3/4] overflow-hidden bg-bone">
                    <Img
                      src={
                        primaryImage(p)?.url ||
                        p.images?.[0] ||
                        p.product_colors?.[0]?.images?.[0]
                      }
                      alt={p.name}
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <p className="mt-3 text-sm">{p.name}</p>
                  <p className="text-xs text-white/50">
                    {formatPrice(p.price)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
