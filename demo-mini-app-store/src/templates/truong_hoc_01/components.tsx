import { useAtom } from "jotai";

import { Badge, useTplTheme } from "../_shared/kit";
import { Notice, readNoticesAtom } from "./data";

const typeLabel: Record<Notice["type"], { label: string; color: string }> = {
  school: { label: "Nhà trường", color: "#4f46e5" },
  class: { label: "Lớp", color: "#0891b2" },
  fee: { label: "Học phí", color: "#d97706" },
};

/** Thẻ thông báo: bấm để đánh dấu đã đọc và mở nội dung. */
export function NoticeCard({ notice }: { notice: Notice }) {
  const [read, setRead] = useAtom(readNoticesAtom);
  const theme = useTplTheme();
  const isRead = read.includes(notice.id);
  const t = typeLabel[notice.type];

  return (
    <button
      onClick={() => !isRead && setRead((r) => [...r, notice.id])}
      className="block w-full rounded-2xl bg-white p-4 text-left shadow-sm"
    >
      <div className="flex items-center gap-2">
        <Badge color={t.color}>{t.label}</Badge>
        <span className="text-[11px] text-gray-400">{notice.date}</span>
        {!isRead && <span className="ml-auto h-2 w-2 rounded-full" style={{ background: theme.accent }} />}
      </div>
      <div className={`mt-2 text-sm ${isRead ? "font-medium" : "font-bold"}`}>{notice.title}</div>
      <div className={`mt-1 text-xs text-gray-500 ${isRead ? "" : "line-clamp-1"}`}>{notice.body}</div>
    </button>
  );
}
