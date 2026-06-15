/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Core brand palette (recovered from src/index.css design tokens).
        ink: "#0a0a0a", // near-black, primary dark surface/text
        smoke: "#fafafa", // off-white, primary light text/surface
        ash: "#6f6f6f", // muted grey, secondary text
        line: "#e5e3df", // hairline borders on light panels
        bone: "#f2efe9", // warm off-white, image/product backgrounds
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "serif"],
        sans: ['"Manrope"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
