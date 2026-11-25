/*
 * THANG CHỮ giao diện quản trị (/admin, /controller — html có class `admin-ui`, biến ở src/index.css):
 *   tiêu đề trang  16px / 600   → text-lg font-semibold
 *   tiêu đề khối   14px / 600   → text-base font-semibold
 *   nội dung       13px         → text-sm
 *   chữ phụ / chú thích 12px    → text-xs (slate-500)
 *   badge / chip   11px         → text-2xs
 *   nhãn nhóm chữ hoa (menu, thẻ thống kê) → text-3xs (quản trị: 8px)
 * Trang chủ không có `admin-ui` → giữ cỡ mặc định của Tailwind. Khung mô phỏng điện thoại (`phone-ui`) cũng giữ mặc định.
 * Không dùng cỡ tuỳ ý text-[..px] trong trang quản trị. Số tiền / số lượng: tabular-nums. Khung dùng chung: src/components/ui/.
 */
const fs = (name, size, lh) => [`var(--fs-${name}, ${size})`, { lineHeight: `var(--lh-${name}, ${lh})` }];
const shades = (name, steps) => Object.fromEntries(steps.map((n) => [n, `rgb(var(--${name}-${n}) / <alpha-value>)`]));
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
        "3xs": fs("3xs", "0.625rem", "0.875rem"),
        "2xs": fs("2xs", "0.6875rem", "1rem"),
        xs: fs("xs", "0.75rem", "1rem"),
        sm: fs("sm", "0.875rem", "1.25rem"),
        base: fs("base", "1rem", "1.5rem"),
        lg: fs("lg", "1.125rem", "1.75rem"),
        xl: fs("xl", "1.25rem", "1.75rem"),
      },
      // Màu & bo góc đọc từ biến CSS (src/index.css): trang chủ giữ bảng màu cũ,
      // trang quản trị (html.admin-ui) dùng bảng trung tính / xanh kiểu Atlassian (Jira) + bo góc gọn kiểu Figma.
      colors: {
        slate: shades("slate", [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
        brand: shades("brand", [50, 100, 200, 300, 400, 500, 600, 700, 800]),
      },
      // Bóng thẻ kiểu Jira (thẻ trên board)
      boxShadow: {
        card: "0 1px 1px rgba(9,30,66,.25), 0 0 1px rgba(9,30,66,.31)",
        "card-hover": "0 4px 8px -2px rgba(9,30,66,.25), 0 0 1px rgba(9,30,66,.31)",
      },
      borderRadius: {
        md: "var(--r-md, 0.375rem)",
        lg: "var(--r-lg, 0.5rem)",
        xl: "var(--r-xl, 0.75rem)",
        "2xl": "var(--r-2xl, 1rem)",
        "3xl": "var(--r-3xl, 1.5rem)",
      },
    },
  },
  plugins: [],
};
