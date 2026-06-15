import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "data-vendor": [
            "@tanstack/react-query",
            "@supabase/supabase-js",
            "zustand",
          ],
          "motion-vendor": ["framer-motion", "lenis"],
          "monitoring-vendor": ["@sentry/react"],
        },
      },
    },
  },
});
