import React, { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import ProductCard from "../components/ProductCard";
import { useProducts } from "../lib/api";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

export default function Home() {
  const { data: allProducts, isLoading } = useProducts();
  const videoRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Video is in view, play it!
            videoRef.current?.play().catch(e => console.log("Autoplay prevented:", e));
          } else {
            // Video is out of view, pause it to save bandwidth/battery!
            videoRef.current?.pause();
          }
        });
      },
      { threshold: 0.5 } // Trigger when 50% of the video is visible
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => observer.disconnect();
  }, []);
  const featured = allProducts ? allProducts.slice(0, 4) : [];

  return (
    <div data-testid="home-page" className="w-full bg-black pb-20">
      <Helmet>
        <title>Pantherclaw | Premium Baggy & Wide-Leg Denim</title>
        <meta
          name="description"
          content="Shop Pantherclaw premium baggy and wide-leg denim. Engineered in India for those who move different. Free shipping on orders of 2 items or more."
        />
        <link rel="canonical" href="https://pantherclaw.in/" />
        <meta property="og:title" content="Pantherclaw | Premium Denim" />
        <meta
          property="og:description"
          content="Premium baggy and wide-leg denim. Move different."
        />
        <meta property="og:url" content="https://pantherclaw.in/" />
      </Helmet>
      {/* 1. Hero Section */}
      <section className="w-full mb-1">
        <Link to="/shop" className="group block cursor-pointer">
          <div className="w-full h-[75vh] md:h-[100vh] overflow-hidden bg-[#111]">
            <img
              src="https://cdn.pantherclaw.in/images/Gemini_Generated_Image_motm6wmotm6wmotm-clean.png"
              alt="Spring Drop"
              className="w-full h-full object-cover object-[center_30%]"
              fetchpriority="high"
            />
          </div>
          <div className="sticky bottom-0 z-10 w-full py-4 px-4 sm:px-6 md:px-8 flex items-center justify-between bg-black text-white border-b border-[#222]">
            <span className="text-sm font-medium tracking-wider uppercase">
              Spring Drop 01
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-hover:translate-x-1"
            >
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </div>
        </Link>
      </section>

      {/* 2. 50/50 Split Banners */}
      <section className="w-full grid grid-cols-1 md:grid-cols-2 gap-y-1 md:gap-x-1 mb-20">
        <Link to="/shop?category=Men" className="group block cursor-pointer">
          <div className="w-full aspect-[3/4] overflow-hidden bg-[#111]">
            <img
              src="https://cdn.pantherclaw.in/images/Gemini_Generated_Image_t1txt2t1txt2t1tx (1)-clean.png"
              alt="Men"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="sticky bottom-0 z-10 w-full py-4 px-4 sm:px-6 md:px-8 flex items-center justify-between bg-black text-white border-b border-[#222]">
            <span className="text-sm font-medium tracking-wider uppercase">
              Men
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-hover:translate-x-1"
            >
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </div>
        </Link>
        <Link to="/shop?category=Women" className="group block cursor-pointer">
          <div className="w-full aspect-[3/4] overflow-hidden bg-[#111]">
            <img
              src="https://cdn.pantherclaw.in/images/Gemini_Generated_Image_evcefsevcefsevce-clean.png"
              alt="Women"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="sticky bottom-0 z-10 w-full py-4 px-4 sm:px-6 md:px-8 flex items-center justify-between bg-black text-white border-b border-[#222]">
            <span className="text-sm font-medium tracking-wider uppercase">
              Women
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-hover:translate-x-1"
            >
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </div>
        </Link>
      </section>

      {/* 3. Seamless Canvas Grid */}
      <section className="w-full bg-[#f9f9f9]">
        {/* Desktop: Grid of 3 columns */}
        <div className="hidden md:grid grid-cols-3 w-full">
          {[
            "https://cdn.pantherclaw.in/images/Gemini_Generated_Image_mbal2rmbal2rmbal (1)-clean.png",
            "https://cdn.pantherclaw.in/images/1000144719.png",
            "https://cdn.pantherclaw.in/images/1000144720.png",
            "https://cdn.pantherclaw.in/images/Gemini_Generated_Image_jtr8kcjtr8kcjtr8-clean.png",
            "https://cdn.pantherclaw.in/images/Gemini_Generated_Image_n0b4ygn0b4ygn0b4-clean.png",
            "https://cdn.pantherclaw.in/images/Gemini_Generated_Image_38zhne38zhne38zh-clean.png",
          ].map((src, index) => (
            <Link
              key={index}
              to="/shop"
              className="w-full flex justify-center items-center"
            >
              <img
                src={src}
                alt={`Product ${index + 1}`}
                className="w-full h-auto object-contain"
                loading="lazy"
              />
            </Link>
          ))}
        </div>

        {/* Mobile: Grid of 2 columns */}
        <div className="grid md:hidden grid-cols-2 w-full">
          {[
            "https://cdn.pantherclaw.in/images/Gemini_Generated_Image_mbal2rmbal2rmbal (1)-clean.png",
            "https://cdn.pantherclaw.in/images/1000144719.png",
            "https://cdn.pantherclaw.in/images/1000144720.png",
            "https://cdn.pantherclaw.in/images/1000150020.png",
            "https://cdn.pantherclaw.in/images/1000150765.png",
            "https://cdn.pantherclaw.in/images/1000150766.png",
          ].map((src, index) => (
            <Link
              key={index}
              to="/shop"
              className="w-full flex justify-center items-center"
            >
              <img
                src={src}
                alt={`Product`}
                className="w-full h-auto object-contain"
                loading="lazy"
              />
            </Link>
          ))}
        </div>
      </section>

      {/* 4. Lookbook / Extra Images */}
      <section className="w-full bg-black flex justify-center">
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 px-4 md:px-8">
          <Link to="/shop" className="group block cursor-pointer h-full">
            <div className="w-full h-full min-h-[500px] overflow-hidden bg-black">
              <img
                src="https://cdn.pantherclaw.in/1780682352961-kx9boc.png"
                alt="Lookbook 1"
                className="w-full h-full object-cover object-top scale-[1.15]"
                loading="lazy"
              />
            </div>
          </Link>
          <Link to="/shop" className="group block cursor-pointer h-full">
            <div className="w-full h-full min-h-[500px] overflow-hidden bg-black">
              <img
                src="https://cdn.pantherclaw.in/images/IMG-20260610-WA0038%20(2).jpg"
                alt="Lookbook 2"
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
            </div>
          </Link>
        </div>
      </section>

      {/* 5. Campaign Video */}
      <section className="w-full bg-black flex justify-center">
        <div className="w-full">
          <video
            ref={videoRef}
            src="https://cdn.pantherclaw.in/images/VID-20260611-WA0102.mp4"
            className="w-full h-auto aspect-video object-cover"
            muted
            playsInline
            loop
          />
        </div>
      </section>
    </div>
  );
}
