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
        // Helia brand — indigo-violet from the "HELIA" wordmark and H-bar.
        brand: {
          50: "#eeedf8",
          100: "#dad8f0",
          200: "#b8b4e2",
          300: "#9189d1",
          400: "#6a60bd",
          500: "#4f45a6",
          600: "#3f3a93",
          700: "#332e76",
          800: "#2a265e",
          900: "#221f4b",
        },
        // Green from the medical cross.
        accent: {
          50: "#eef8ea",
          100: "#d6efcc",
          200: "#b4e29f",
          300: "#8ed46f",
          400: "#6fc44e",
          500: "#5cb947",
          600: "#4a9c39",
          700: "#3b7c2e",
          800: "#316427",
          900: "#294f22",
        },
        // Amber from the lab droplet.
        droplet: {
          400: "#f5bd5d",
          500: "#f0a93a",
          600: "#d98f25",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
