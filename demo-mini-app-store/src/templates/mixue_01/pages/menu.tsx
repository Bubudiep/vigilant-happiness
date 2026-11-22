import { useState } from "react";
import { useNavigate, useSearchParams } from "zmp-ui";

import {
  AddButton,
  formatPrice,
  SearchBox,
  Tile,
  TplHeader,
  TplPage,
  useTplTheme,
} from "../../_shared/kit";
import { drinks, menuCategories, path } from "../data";

export default function MenuPage() {
  const navigate = useNavigate();
  const theme = useTplTheme();
  const [params] = useSearchParams();
  const [cat, setCat] = useState(params.get("cat") ?? menuCategories[0].id);
  const [keyword, setKeyword] = useState("");

  const kw = keyword.trim().toLowerCase();
  const list = kw
    ? drinks.filter((d) => d.name.toLowerCase().includes(kw))
    : drinks.filter((d) => d.category === cat);

  return (
    <TplPage tab>
      <TplHeader title="Thực đơn" back={false}>
        <div className="px-4 pb-2">
          <SearchBox
            placeholder="Tìm món"
            value={keyword}
            onChange={setKeyword}
          />
        </div>
      </TplHeader>

      <div className="flex pl-2 pt-2">
        {!kw && (
          <aside className="sticky top-[104px] w-20 shrink-0 self-start">
            {menuCategories.map((c) => {
              const active = c.id === cat;
              return (
                <button
                  key={c.id}
                  onClick={() => setCat(c.id)}
                  className={`flex w-full flex-col items-center 
                  gap-1 py-3 text-xs transition-colors duration-200
                  ${active ? "rounded-l-xl" : ""}`}
                  style={
                    active
                      ? {
                          borderColor: theme.primary,
                          background: "#fff",
                          color: theme.primary,
                          fontWeight: 600,
                        }
                      : { borderColor: "transparent", color: "#6b7280" }
                  }
                >
                  <span className="text-xl">{c.emoji}</span>
                  {c.label}
                </button>
              );
            })}
          </aside>
        )}

        <div
          className={`flex-1 space-y-2 bg-white p-3 ${
            cat === menuCategories[0].id
              ? "rounded-bl-lg"
              : cat === menuCategories[menuCategories.length - 1].id
                ? "rounded-tl-lg"
                : "rounded-l-lg"
          }`}
        >
          {list.map((d) => (
            <button
              key={d.id}
              onClick={() => navigate(path(`/item/${d.id}`))}
              className="flex w-full gap-3 text-left animate-[fadeInTop_0.3s_ease-in-out] rounded-lg bg-gray-50 p-3"
            >
              <Tile seed={d.id} emoji={d.emoji} color={d.color} className="h-16 w-16" />
              <div className="flex min-w-0 flex-1 flex-col py-0.5">
                <div className="text-sm font-semibold">{d.name}</div>
                <div className="line-clamp-2 text-xs text-gray-500">
                  {d.description}
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <span
                    className="text-sm font-bold"
                    style={{ color: theme.primary }}
                  >
                    {formatPrice(d.price)}
                  </span>
                  <AddButton onClick={() => navigate(path(`/item/${d.id}`))} />
                </div>
              </div>
            </button>
          ))}
          {list.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">
              Không tìm thấy món
            </div>
          )}
        </div>
      </div>
    </TplPage>
  );
}
