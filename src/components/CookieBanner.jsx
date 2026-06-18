import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already given consent
    let consent = null;
    try {
      consent = localStorage.getItem("pantherclaw_cookie_consent");
    } catch (e) {
      console.warn("localStorage is not available");
    }
    if (!consent) {
      setShowBanner(true);
    } else if (consent === "accepted") {
      injectAnalytics();
    }
  }, []);

  const injectAnalytics = () => {
    // 1. Google Analytics (GA4)
    const gaId = "G-0HGH8ME6Y5"; 
    const gaScript1 = document.createElement("script");
    gaScript1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    gaScript1.defer = true;
    document.body.appendChild(gaScript1);

    const gaScript2 = document.createElement("script");
    gaScript2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}');
    `;
    document.body.appendChild(gaScript2);

    // 2. Microsoft Clarity
    const clarityId = "x7lko8ym19";
    const clarityScript = document.createElement("script");
    clarityScript.defer = true;
    clarityScript.innerHTML = `
      (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.defer=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${clarityId}");
    `;
    document.body.appendChild(clarityScript);
  };

  const handleAccept = () => {
    try {
      localStorage.setItem("pantherclaw_cookie_consent", "accepted");
    } catch (e) {
      console.warn("localStorage is not available");
    }
    setShowBanner(false);
    injectAnalytics();
  };

  const handleDecline = () => {
    try {
      localStorage.setItem("pantherclaw_cookie_consent", "declined");
    } catch (e) {
      console.warn("localStorage is not available");
    }
    setShowBanner(false);
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 w-full z-[100] p-4 md:p-6"
        >
          <div className="bg-black border border-white/20 p-6 md:p-8 max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
            <div className="flex-1">
              <h3 className="font-serif text-2xl mb-2 text-white">We Value Your Privacy</h3>
              <p className="text-white/70 text-sm md:text-base leading-relaxed">
                We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic using Microsoft Clarity and Google Analytics. In compliance with the DPDP Act 2023, these tracking scripts remain disabled until you click "Accept All". 
                Read our <Link to="/legal/privacy" className="underline hover:text-white transition-colors">Privacy Policy</Link> for more details.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <button
                onClick={handleDecline}
                className="px-6 py-3 border border-white/20 text-white hover:bg-white/10 transition-colors uppercase tracking-widest text-xs font-bold whitespace-nowrap"
              >
                Reject Non-Essential
              </button>
              <button
                onClick={handleAccept}
                className="px-6 py-3 bg-white text-black hover:bg-white/90 transition-colors uppercase tracking-widest text-xs font-bold whitespace-nowrap"
              >
                Accept All
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
