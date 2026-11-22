import { atom, useAtom } from "jotai";
import { useMemo, useState } from "react";
import { LuSearch } from "react-icons/lu";
import { useNavigate, useSnackbar } from "zmp-ui";

import { categories, CategoryId } from "@/data/categories";
import ShareSheet from "@/components/share/share-sheet";
import { templates, type TemplateMeta } from "@/templates";
import { templateBasePath } from "@/templates/paths";

import Section from "./section";
import TemplateCard from "./template-card";

const activeCategoryAtom = atom<CategoryId | "all">("all");
const searchKeywordAtom = atom("");

/** Danh sách DEMO: lọc theo ngành + tìm kiếm. */
export default function TemplateGallery() {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const [active, setActive] = useAtom(activeCategoryAtom);
  const [keyword, setKeyword] = useAtom(searchKeywordAtom);
  const [sharing, setSharing] = useState<TemplateMeta | null>(null);

  // Chỉ hiện chip của những ngành đang có mẫu
  const usedCategories = useMemo(
    () => categories.filter((c) => templates.some((t) => t.categories.includes(c.id))),
    [],
  );

  const list = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return templates
      .filter((t) => active === "all" || t.categories.includes(active))
      .filter((t) => !kw || `${t.code} ${t.name} ${t.description}`.toLowerCase().includes(kw))
      .sort((a, b) => Number(b.status === "live") - Number(a.status === "live"));
  }, [active, keyword]);

  return (
    <Section id="demo-gallery" eyebrow="Kho mẫu" title="Mẫu Mini App theo ngành">
      <label className="flex items-center gap-2 rounded-xl border border-gray-200/80 bg-white px-3 py-2.5 text-sm shadow-sm">
        <LuSearch size={18} className="text-gray-400" />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm mẫu theo tên, ngành..."
          className="flex-1 bg-transparent outline-none"
        />
      </label>

      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {[{ id: "all" as const, label: "Tất cả" }, ...usedCategories].map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${
              active === c.id
                ? "border-brand-600 bg-brand-600 font-semibold text-white"
                : "border-gray-200/80 bg-white text-gray-600"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-3 text-xs text-gray-500">{list.length} mẫu</div>

      <div className="mt-2 grid grid-cols-2 gap-3">
        {list.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            onShare={t.status === "live" ? () => setSharing(t) : undefined}
            onOpen={() =>
              t.status === "live"
                ? navigate(templateBasePath(t.id))
                : openSnackbar({ text: `Mẫu "${t.name}" đang được hoàn thiện`, type: "info" })
            }
          />
        ))}
      </div>

      {list.length === 0 && <div className="py-12 text-center text-sm text-gray-400">Không có mẫu phù hợp</div>}
      <ShareSheet
        visible={!!sharing}
        onClose={() => setSharing(null)}
        template={sharing ?? undefined}
      />
    </Section>
  );
}
