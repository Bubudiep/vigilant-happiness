/*
 * THANG CHỮ giao diện quản trị (không dùng chữ < 12px, trừ badge/chip nhỏ):
 *   tiêu đề trang  18px / 600   → text-lg font-semibold
 *   tiêu đề khối   15px / 600   → text-[15px] font-semibold
 *   nội dung       14px         → text-sm
 *   chữ phụ        13px slate-500 → text-[13px] text-slate-500
 *   chú thích      12px         → text-xs
 * Số tiền / số lượng: thêm tabular-nums. Khung dùng chung: src/components/ui/.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Font: Be Vietnam Pro tự host (src/fonts.css), dự phòng font hệ thống
      fontFamily: {
        sans: ['"Be Vietnam Pro"', "ui-sans-serif", "system-ui", "-apple-system", '"Segoe UI"', "Roboto", "sans-serif"],
      },
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
