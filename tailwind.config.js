/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0a",
        smoke: "#fafafa",
        bone: "#f5f5f2",
        line: "#e5e5e5",
        ash: "#525252"
      },
      fontFamily: {
        sans: ["Manrope", "sans-serif"],
        serif: ["Cormorant Garamond", "serif"]
      }
    },
  },
  plugins: [],
}
