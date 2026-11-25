import type { ReactNode } from "react";

/** Props chuẩn cho <Form> trong Modal/Drawer: nhãn phía trên, không dấu * (nhãn 13/500 đặt ở index.css). */
export const FORM_PROPS = { layout: "vertical", requiredMark: false } as const;

/** Lưới 2 cột từ `sm` cho trường ngắn; trường dài (textarea, danh sách) đặt ngoài lưới để full width. */
export function FormGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <div className={`grid gap-x-4 ${cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>{children}</div>;
}

/** Chân form tự dựng (không dùng footer của Modal): "Huỷ" rồi nút chính, căn phải. */
export function FormFooter({ children }: { children: ReactNode }) {
  return <div className="mt-2 flex flex-wrap justify-end gap-2">{children}</div>;
}
