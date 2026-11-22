import { LuShare2 } from "react-icons/lu";
import { RiStarFill } from "react-icons/ri";

import { templateThumbnails } from "@/assets/thumbs";
import { categoryLabel } from "@/data/categories";
import type { TemplateMeta } from "@/templates";

/**
 * Thẻ một mẫu demo trong danh sách.
 * Phần preview dùng thẻ `<img>` tĩnh (`loading="lazy" decoding="async"`) thay cho DOM phức tạp
 * giúp trang chủ nhẹ và cuộn mượt hơn nhiều.
 */
export default function TemplateCard({
  template,
  onOpen,
  onShare,
}: {
  template: TemplateMeta;
  onOpen: () => void;
  /** Có thì hiện nút chia sẻ nhỏ ở góc ảnh */
  onShare?: () => void;
}) {
  const live = template.status === "live";
  const thumbSrc = template.thumbnail ?? templateThumbnails[template.id];

  return (
    <button
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white text-left shadow-sm transition-transform active:scale-[0.99]"
    >
      <div
        className="relative h-48 w-full overflow-hidden"
        style={{ background: `${template.color}14` }}
      >
        {thumbSrc && (
          <img
            src={thumbSrc}
            alt={template.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        )}
        {template.featured && (
          <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-0.5 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
            <RiStarFill size={10} /> Nổi bật
          </span>
        )}
        {onShare && (
          <span
            role="button"
            aria-label={`Chia sẻ mẫu ${template.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            className="absolute bottom-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-gray-800 shadow-md"
          >
            <LuShare2 size={15} />
          </span>
        )}
        {!live && (
          <span className="absolute right-2 top-2 z-10 rounded-full bg-gray-800/75 px-2 py-0.5 text-[10px] text-white">
            Sắp có
          </span>
        )}
      </div>

      <div className="flex w-full flex-1 flex-col p-3">
        <div className="flex flex-wrap gap-1">
          {template.categories.map((cat) => (
            <span
              key={cat}
              className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600"
            >
              {categoryLabel(cat)}
            </span>
          ))}
        </div>
        <div className="mt-1.5 line-clamp-1 text-sm font-bold leading-snug text-gray-900">
          [{template.code}] {template.name}
        </div>
        {template.brand && (
          <div className="text-[11px] font-medium text-gray-500">{template.brand}</div>
        )}
        <div className="mt-1.5 flex flex-wrap gap-1">
          {template.features.slice(0, 2).map((f) => (
            <span key={f} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
              {f}
            </span>
          ))}
        </div>
        <div
          className={`mt-3 flex items-center justify-center gap-1 rounded-xl border py-2 text-center text-xs font-bold transition-colors ${
            live
              ? "border-brand-600/30 bg-brand-600/5 text-brand-600 group-active:bg-brand-600 group-active:text-white"
              : "border-gray-200 bg-gray-50 text-gray-400"
          }`}
        >
          {live ? "Xem mẫu demo ›" : "Sắp ra mắt"}
        </div>
      </div>
    </button>
  );
}
