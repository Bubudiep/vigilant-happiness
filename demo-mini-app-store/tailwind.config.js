module.exports = {
  darkMode: ["selector", '[zaui-theme="dark"]'],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Màu thương hiệu Công ty T — đổi tại đây
        brand: {
          50: "#eef4ff",
          100: "#dbe7ff",
          500: "#2f6bff",
          600: "#1f55e6",
          700: "#1a45b8",
        },
        accent: "#ff7a1a",
      },
      fontFamily: {
        mono: ["Roboto Mono", "monospace"],
      },
    },
  },
};
