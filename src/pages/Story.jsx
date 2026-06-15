import React, { useRef } from "react";
import { Helmet } from "react-helmet-async";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";

export default function Story() {
  const containerRef = useRef(null);

  // We track the scroll progress of the entire container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // 1. HERO REVEAL: Fades out and scales up slightly as you scroll down
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 1.2]);
  const heroTextY = useTransform(scrollYProgress, [0, 0.15], [0, 100]);

  // 2. MANIFESTO REVEAL: Fades in as hero fades out, then fades out
  const manifestoOpacity = useTransform(scrollYProgress, [0.15, 0.25, 0.35, 0.45], [0, 1, 1, 0]);
  const manifestoY = useTransform(scrollYProgress, [0.15, 0.45], [100, -100]);

  // 3. PARALLAX LOOKBOOK: Starts moving up after the manifesto
  // Image 1: Moves fast
  const img1Y = useTransform(scrollYProgress, [0.4, 0.8], ["50vh", "-50vh"]);
  const img1Opacity = useTransform(scrollYProgress, [0.4, 0.5, 0.7, 0.8], [0, 1, 1, 0]);
  
  // Image 2: Moves slow (creates depth)
  const img2Y = useTransform(scrollYProgress, [0.45, 0.85], ["70vh", "-30vh"]);
  const img2Opacity = useTransform(scrollYProgress, [0.45, 0.55, 0.75, 0.85], [0, 1, 1, 0]);

  // Image 3: Moves extremely fast, massive image
  const img3Y = useTransform(scrollYProgress, [0.5, 0.9], ["100vh", "-80vh"]);
  const img3Opacity = useTransform(scrollYProgress, [0.5, 0.6, 0.8, 0.9], [0, 1, 1, 0]);

  // 4. THE CTA: Fades in at the very end
  const ctaOpacity = useTransform(scrollYProgress, [0.85, 0.95], [0, 1]);
  const ctaY = useTransform(scrollYProgress, [0.85, 0.95], [50, 0]);

  return (
    <div ref={containerRef} className="relative bg-black w-full" style={{ height: "400vh" }}>
      <Helmet>
        <title>Our Story | Pantherclaw</title>
        <meta
          name="description"
          content="Pantherclaw was born to create premium baggy and wide-leg denim. Engineered in India for those who move different."
        />
        <link rel="canonical" href="https://pantherclaw.in/story" />
      </Helmet>

      {/* --- FIXED VIEWPORT CONTAINER --- */}
      <div className="sticky top-0 left-0 w-full h-screen overflow-hidden pointer-events-none">
        
        {/* 1. HERO SEQUENCE */}
        <motion.div 
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-4"
          style={{ opacity: heroOpacity, scale: heroScale }}
        >
          <motion.div 
            className="absolute inset-0 bg-[url('https://cdn.pantherclaw.in/images/img2.jpeg')] bg-cover bg-center opacity-30"
          />
          <motion.h1 
            style={{ y: heroTextY }}
            className="display text-[5rem] sm:text-[8rem] md:text-[12rem] lg:text-[16rem] leading-[0.85] tracking-tighter uppercase relative z-10"
          >
            WE ARE <br/> PANTHERCLAW
          </motion.h1>
          <motion.p 
            style={{ y: heroTextY }}
            className="mt-8 text-white/50 uppercase tracking-[0.3em] font-bold text-sm sm:text-base relative z-10"
          >
            Scroll to discover
          </motion.p>
        </motion.div>

        {/* 2. THE MANIFESTO */}
        <motion.div 
          className="absolute inset-0 flex items-center justify-center px-6 md:px-12 text-center"
          style={{ opacity: manifestoOpacity, y: manifestoY }}
        >
          <h2 className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl leading-tight max-w-[1200px]">
            ENGINEERED IN INDIA. <br className="hidden md:block"/> FOR THOSE WHO <br className="hidden md:block"/> MOVE DIFFERENT.
          </h2>
        </motion.div>

        {/* 3. PARALLAX LOOKBOOK */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Image 1 (Left) */}
          <motion.div 
            className="absolute left-[5%] top-[10%] w-[40%] md:w-[25%] aspect-[3/4]"
            style={{ y: img1Y, opacity: img1Opacity }}
          >
            <img 
              src="https://cdn.pantherclaw.in/images/img1.jpeg" 
              alt="Look 1"
              className="w-full h-full object-cover grayscale opacity-80"
            />
          </motion.div>

          {/* Image 2 (Right) */}
          <motion.div 
            className="absolute right-[5%] top-[30%] w-[50%] md:w-[35%] aspect-square"
            style={{ y: img2Y, opacity: img2Opacity }}
          >
            <img 
              src="https://cdn.pantherclaw.in/1780682689003-rky4f.jpeg" 
              alt="Look 2"
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Image 3 (Center, Massive) */}
          <motion.div 
            className="absolute left-1/2 -translate-x-1/2 top-[50%] w-[90%] md:w-[60%] aspect-[16/9]"
            style={{ y: img3Y, opacity: img3Opacity }}
          >
            <img 
              src="https://cdn.pantherclaw.in/images/img5.jpeg" 
              alt="Look 3"
              className="w-full h-full object-cover grayscale"
            />
          </motion.div>
        </div>

        {/* 4. THE CALL TO ACTION */}
        <motion.div 
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto bg-black"
          style={{ opacity: ctaOpacity }}
        >
          <motion.div style={{ y: ctaY }} className="text-center">
            <h2 className="display text-6xl md:text-9xl uppercase tracking-tighter mb-12">
              THE <br/> COLLECTION
            </h2>
            <Link 
              to="/shop"
              className="px-12 py-6 border border-white text-white hover:bg-white hover:text-black transition-colors uppercase tracking-[0.3em] font-bold text-sm"
            >
              Explore Now
            </Link>
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
}
