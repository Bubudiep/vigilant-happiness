/*
 * THANG CHỮ giao diện quản trị (/admin, /controller — html có class `admin-ui`, biến ở src/index.css):
 *   tiêu đề trang  16px / 600   → text-lg font-semibold
 *   tiêu đề khối   14px / 600   → text-base font-semibold
 *   nội dung       13px         → text-sm
 *   chữ phụ / chú thích 12px    → text-xs (slate-500)
 *   badge / chip   11px         → text-2xs
 * Trang chủ không có `admin-ui` → giữ cỡ mặc định của Tailwind. Khung mô phỏng điện thoại (`phone-ui`) cũng giữ mặc định.
 * Không dùng cỡ tuỳ ý text-[..px] trong trang quản trị. Số tiền / số lượng: tabular-nums. Khung dùng chung: src/components/ui/.
 */
const fs = (name, size, lh) => [`var(--fs-${name}, ${size})`, { lineHeight: `var(--lh-${name}, ${lh})` }];
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Font: Be Vietnam Pro tự host (src/fonts.css), dự phòng font hệ thống
      fontFamily: {
        sans: ['"Be Vietnam Pro"', "ui-sans-serif", "system-ui", "-apple-system", '"Segoe UI"', "Roboto", "sans-serif"],
      },
      fontSize: {
        "2xs": fs("2xs", "0.6875rem", "1rem"),
        xs: fs("xs", "0.75rem", "1rem"),
        sm: fs("sm", "0.875rem", "1.25rem"),
        base: fs("base", "1rem", "1.5rem"),
        lg: fs("lg", "1.125rem", "1.75rem"),
        xl: fs("xl", "1.25rem", "1.75rem"),
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
