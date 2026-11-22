import { useState } from "react";
import { Icon, useNavigate } from "zmp-ui";

import { SearchBox, TplHeader, TplPage } from "../../_shared/kit";
import { path, procedures } from "../data";

export default function ProceduresPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const kw = keyword.trim().toLowerCase();
  const list = procedures.filter((p) => !kw || p.name.toLowerCase().includes(kw));
  const groups = Array.from(new Set(list.map((p) => p.group)));

  return (
    <TplPage tab>
      <TplHeader title="Thủ tục hành chính" back={false}>
        <div className="px-4 pb-2">
          <SearchBox placeholder="VD: khai sinh, tạm trú..." value={keyword} onChange={setKeyword} />
        </div>
      </TplHeader>

      <div className="space-y-4 px-4 pt-3">
        {groups.map((g) => (
          <div key={g}>
            <div className="mb-2 text-xs font-semibold uppercase text-gray-400">{g}</div>
            <div className="divide-y divide-gray-100 rounded-2xl bg-white shadow-sm">
              {list
                .filter((p) => p.group === g)
                .map((p) => (
                  <button key={p.id} onClick={() => navigate(path(`/procedure/${p.id}`))} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    <span className="text-xl">📄</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{p.name}</div>
                      <div className="text-[11px] text-gray-400">
                        {p.time} · {p.fee}
                      </div>
                    </div>
                    <Icon icon="zi-chevron-right" size={18} className="text-gray-300" />
                  </button>
                ))}
            </div>
          </div>
        ))}
        {groups.length === 0 && <div className="py-12 text-center text-sm text-gray-400">Không tìm thấy thủ tục</div>}
      </div>
    </TplPage>
  );
}
