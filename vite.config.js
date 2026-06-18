import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ["defaults", "not IE 11"],
      modernPolyfills: true,
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: "es2015",
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) {
              return "react-vendor";
            }
            if (id.includes("@tanstack/react-query") || id.includes("@supabase/supabase-js") || id.includes("zustand")) {
              return "data-vendor";
            }
            if (id.includes("framer-motion") || id.includes("lenis")) {
              return "motion-vendor";
            }
            if (id.includes("@sentry/react")) {
              return "monitoring-vendor";
            }
          }
        },
      },
    },
  },
});
