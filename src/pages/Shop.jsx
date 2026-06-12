import React from "react";
import ProductCard from "../components/ProductCard";
import { useProducts } from "../lib/api";

export default function Shop() {
  const { data: products, isLoading, isError } = useProducts();

  return (
    <div className="pt-28 px-4 sm:px-6 md:px-12 max-w-[1600px] mx-auto min-h-screen">
      <h1 className="font-serif text-5xl mb-10">Shop All</h1>
      
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse flex flex-col gap-4">
              <div className="bg-line aspect-[3/4] w-full" />
              <div className="h-4 bg-line w-2/3" />
              <div className="h-4 bg-line w-1/3" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="text-red-500 py-10">Failed to load products. Please try again.</div>
      )}

      {!isLoading && !isError && products?.length === 0 && (
        <div className="py-10 text-ash">No products found.</div>
      )}

      {!isLoading && !isError && products?.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {products.flatMap(p => 
            p.product_colors && p.product_colors.length > 0
              ? p.product_colors.map(color => (
                  <ProductCard 
                    key={`${p.id}-${color.id}`} 
                    product={{
                      ...p,
                      color_slug: color.color_slug, // Pass separately, do not pollute slug
                      images: color.images,
                      subtitle: `${p.subtitle ? p.subtitle + ' · ' : ''}${color.color_name}`,
                      product_colors: [color],
                    }} 
                  />
                ))
              : <ProductCard key={p.slug || p.id} product={p} />
          )}
        </div>
      )}
    </div>
  );
}
