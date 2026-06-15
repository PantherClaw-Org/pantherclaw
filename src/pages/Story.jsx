import React, { useRef } from "react";
import { Helmet } from "react-helmet-async";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Link } from "react-router-dom";

export default function Story() {
  // Container 1: The Shrinking Hero (150vh so it pins for a bit while scrolling)
  const heroRef = useRef(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  
  // Smooth the progress slightly
  const smoothHeroProgress = useSpring(heroProgress, { stiffness: 400, damping: 40 });
  const heroScale = useTransform(smoothHeroProgress, [0, 1], [1, 0.4]);
  const heroBorderRadius = useTransform(smoothHeroProgress, [0, 1], ["0px", "40px"]);
  const heroOpacity = useTransform(smoothHeroProgress, [0.8, 1], [1, 0]);

  // Container 2: Text Reveal (200vh)
  const textRef = useRef(null);
  const { scrollYProgress: textProgress } = useScroll({
    target: textRef,
    offset: ["start center", "end center"],
  });
  const textClipPath = useTransform(textProgress, [0, 1], ["polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)", "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)"]);

  // Container 3: Pinned Horizontal Scroll Gallery (400vh)
  const galleryRef = useRef(null);
  const { scrollYProgress: galleryProgress } = useScroll({
    target: galleryRef,
    offset: ["start start", "end end"],
  });
  const galleryX = useTransform(galleryProgress, [0, 1], ["0%", "-75%"]);

  return (
    <div className="bg-black min-h-screen text-white relative">
      <Helmet>
        <title>Our Story | Pantherclaw</title>
        <meta
          name="description"
          content="Pantherclaw was born to create premium baggy and wide-leg denim. Engineered in India for those who move different."
        />
        <link rel="canonical" href="https://pantherclaw.in/story" />
      </Helmet>

      {/* --- SVG FILM GRAIN OVERLAY --- */}
      <div 
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.04] mix-blend-screen"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      ></div>

      {/* 1. THE SHRINKING HERO */}
      <div ref={heroRef} className="relative h-[150vh] w-full">
        <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
          <motion.div 
            style={{ 
              scale: heroScale, 
              borderRadius: heroBorderRadius,
              opacity: heroOpacity
            }}
            className="w-full h-full overflow-hidden relative"
          >
            <img 
              src="https://cdn.pantherclaw.in/images/Gemini_Generated_Image_mbal2rmbal2rmbal%20(1)-clean.png" 
              alt="Pantherclaw Hero"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <h1 className="display text-[5rem] md:text-[10rem] lg:text-[14rem] tracking-tighter leading-none text-center mix-blend-overlay opacity-80">
                PANTHERCLAW
              </h1>
            </div>
            {/* Scroll Indicator */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 text-white/50">
              <span className="uppercase tracking-[0.3em] text-xs font-bold">Scroll</span>
              <div className="w-[1px] h-12 bg-gradient-to-b from-white/50 to-transparent"></div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 2. THE TEXT FILL REVEAL */}
      <div ref={textRef} className="relative h-[200vh] w-full flex items-center justify-center px-6 md:px-12">
        <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden max-w-[1400px] mx-auto">
          <div className="relative text-center mb-16">
            {/* Outlined Base Text */}
            <h2 className="display text-5xl md:text-8xl lg:text-9xl leading-[0.9] tracking-tighter uppercase text-transparent" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.2)" }}>
              Engineered in India.<br />For those who<br />move different.
            </h2>
            
            {/* Solid Fill Overlay Text */}
            <motion.h2 
              style={{ clipPath: textClipPath }}
              className="absolute inset-0 display text-5xl md:text-8xl lg:text-9xl leading-[0.9] tracking-tighter uppercase text-white"
            >
              Engineered in India.<br />For those who<br />move different.
            </motion.h2>
          </div>
        </div>
      </div>

      {/* 3. PINNED HORIZONTAL SCROLL GALLERY */}
      <div ref={galleryRef} className="relative h-[400vh] w-full bg-[#0a0a0a]">
        <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center">
          
          {/* Moving Track */}
          <motion.div 
            style={{ x: galleryX }}
            className="flex gap-12 md:gap-24 px-[10vw] items-center h-full min-w-max"
          >
            {/* Gallery Item 1 */}
            <div className="w-[80vw] md:w-[60vw] h-[60vh] md:h-[80vh] flex flex-col justify-center">
              <div className="w-full h-full overflow-hidden relative">
                <img src="https://cdn.pantherclaw.in/images/1000144719.png" className="w-full h-full object-cover object-top" alt="Editorial 1" />
              </div>
              <div className="mt-6 flex justify-between uppercase tracking-widest text-xs font-bold text-white/50">
                <span>01 // The Silhouette</span>
                <span>Vol. I</span>
              </div>
            </div>

            {/* Gallery Item 2 */}
            <div className="w-[60vw] md:w-[40vw] h-[50vh] md:h-[70vh] flex flex-col justify-center">
              <div className="w-full h-full overflow-hidden relative">
                <img src="https://cdn.pantherclaw.in/1780682352961-kx9boc.png" className="w-full h-full object-cover object-top" alt="Editorial 2" />
              </div>
              <div className="mt-6 flex justify-between uppercase tracking-widest text-xs font-bold text-white/50">
                <span>02 // Raw Details</span>
                <span>Vol. I</span>
              </div>
            </div>

            {/* Gallery Item 3 */}
            <div className="w-[80vw] md:w-[60vw] h-[60vh] md:h-[80vh] flex flex-col justify-center">
              <div className="w-full h-full overflow-hidden relative">
                <img src="https://cdn.pantherclaw.in/images/1000144720.png" className="w-full h-full object-cover object-top" alt="Editorial 3" />
              </div>
              <div className="mt-6 flex justify-between uppercase tracking-widest text-xs font-bold text-white/50">
                <span>03 // Excessive Drape</span>
                <span>Vol. I</span>
              </div>
            </div>

            {/* Final Item: The CTA */}
            <div className="w-[100vw] h-screen flex flex-col items-center justify-center text-center">
              <h2 className="display text-7xl md:text-[10rem] uppercase tracking-tighter leading-none mb-12">
                THE<br/>COLLECTION
              </h2>
              <Link 
                to="/shop"
                className="px-16 py-8 bg-white text-black hover:bg-white/80 transition-colors uppercase tracking-[0.3em] font-bold text-sm"
              >
                Shop Now
              </Link>
            </div>
            
          </motion.div>
        </div>
      </div>
    </div>
  );
}
