import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <Helmet>
        <title>Page Not Found — PANTHERCLAW</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <p className="label text-white/40 mb-4">Error 404</p>
      <h1 className="display text-6xl md:text-8xl text-smoke mb-6">
        Lost the thread.
      </h1>
      <p className="text-white/60 max-w-md mb-10">
        The page you're looking for has moved, sold out, or never existed.
      </p>
      <div className="flex gap-4">
        <Link
          to="/"
          className="bg-smoke text-ink px-8 py-4 label hover:bg-white transition-colors"
        >
          Back to Home
        </Link>
        <Link
          to="/shop"
          className="border border-white/30 text-smoke px-8 py-4 label hover:border-smoke transition-colors"
        >
          Shop Denim
        </Link>
      </div>
    </div>
  );
}
