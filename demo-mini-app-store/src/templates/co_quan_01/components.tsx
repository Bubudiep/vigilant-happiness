import { useDemoAction } from "../_shared/kit";

export function NewsRow({ item }: { item: { emoji: string; title: string; date: string } }) {
  const demoAction = useDemoAction();
  return (
    <button onClick={() => demoAction("Đọc tin tức")} className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-2xl">{item.emoji}</div>
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-sm font-medium">{item.title}</div>
        <div className="mt-0.5 text-[11px] text-gray-400">{item.date}</div>
      </div>
    </button>
  );
}
