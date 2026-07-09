/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Helia brand — deep indigo-violet from the "HELIA" wordmark and H-bars.
        brand: {
          50: "#eeecfa",
          100: "#dcd7f5",
          200: "#bcb2ea",
          300: "#9885dd",
          400: "#7458cf",
          500: "#5639bd",
          600: "#4529a6",
          700: "#351f83", // wordmark / headings
          800: "#2b1a69",
          900: "#241656",
        },
        // Leaf green from the medical cross.
        accent: {
          50: "#edf8e7",
          100: "#d5efc6",
          200: "#b3e298",
          300: "#8bd465",
          400: "#67c53f",
          500: "#52b52c", // cross green
          600: "#439722",
          700: "#367a1e",
          800: "#2e6319",
          900: "#275117",
        },
        // Amber from the lab droplet.
        droplet: {
          300: "#fad07f",
          400: "#f8bd57",
          500: "#f5a623", // droplet
          600: "#dc8b14",
          700: "#b06e10",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
