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
        // Helia brand palette — calm clinical teal/slate.
        brand: {
          50: "#eef9f8",
          100: "#d4efed",
          200: "#a9dedb",
          300: "#73c6c2",
          400: "#42a8a4",
          500: "#2a8c89",
          600: "#21706e",
          700: "#1d5a59",
          800: "#1a4847",
          900: "#163b3a",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
