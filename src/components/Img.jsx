import React, { useState, useRef, useEffect } from "react";

// Responsive, lazy-loaded image with optional blur-up placeholder.
//
// Works today with plain <img>. The moment you enable Cloudflare Image
// Resizing on the cdn.pantherclaw.in zone and set VITE_CF_IMAGE_RESIZE=true,
// every image on the site automatically upgrades to resized, auto-format
// (WebP/AVIF) responsive srcset variants — no code changes needed.
//
// Pass `blurhash` (a data: URI thumbnail or solid placeholder colour) to get
// a smooth fade-in from a low-quality placeholder while the full image loads.

const CDN_BASE = import.meta.env.VITE_CDN_BASE || "https://cdn.pantherclaw.in";
const RESIZE = import.meta.env.VITE_CF_IMAGE_RESIZE === "true";
const WIDTHS = [320, 480, 640, 768, 1024, 1280, 1600];

function transform(src, w) {
  // Cloudflare Image Resizing URL form: /cdn-cgi/image/<options>/<source>
  return `${CDN_BASE}/cdn-cgi/image/width=${w},quality=82,format=auto/${src}`;
}

// Build a CSS background for the placeholder. A data: URI is used as an image;
// anything else (e.g. a hex colour) is used as a solid background colour.
function placeholderStyle(blurhash) {
  if (!blurhash) return { backgroundColor: "#f2efe9" };
  if (typeof blurhash === "string" && blurhash.startsWith("data:")) {
    return {
      backgroundImage: `url("${blurhash}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  if (typeof blurhash === "string" && /^#?[0-9a-fA-F]{3,8}$/.test(blurhash)) {
    return {
      backgroundColor: blurhash.startsWith("#") ? blurhash : `#${blurhash}`,
    };
  }
  return { backgroundColor: "#f2efe9" };
}

export default function Img({
  src,
  alt = "",
  sizes = "100vw",
  eager = false,
  blurhash,
  className,
  style,
  ...rest
}) {
  const imgRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  // Cached images can finish loading before React attaches the onLoad handler,
  // which would otherwise leave them stuck at the placeholder opacity (0.01) —
  // i.e. effectively invisible. Detect the already-complete case on mount /
  // src change so cached images still fade in.
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true);
  }, [src]);

  if (!src) return null;

  const canResize =
    RESIZE && typeof src === "string" && src.startsWith(CDN_BASE);

  const common = {
    alt,
    className,
    loading: eager ? "eager" : "lazy",
    decoding: "async",
    onLoad: () => setLoaded(true),
    onError: () => setLoaded(true),
    style: {
      ...placeholderStyle(blurhash),
      transition: "opacity 400ms ease",
      opacity: loaded ? 1 : blurhash ? 0.01 : 1,
      ...style,
    },
    ...rest,
  };

  if (!canResize) {
    return <img ref={imgRef} src={src} {...common} />;
  }

  return (
    <img
      ref={imgRef}
      src={transform(src, 1024)}
      srcSet={WIDTHS.map((w) => `${transform(src, w)} ${w}w`).join(", ")}
      sizes={sizes}
      {...common}
    />
  );
}
