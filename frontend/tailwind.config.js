/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dce7ff",
          500: "#2563eb",
          600: "#1657f3",
          700: "#1242c4",
        },
      },
    },
  },
  plugins: [],
};
