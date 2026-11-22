import { useSetAtom } from "jotai";
import { useState } from "react";

import { ChipRow, TplHeader, TplPage } from "../../_shared/kit";
import { NoticeCard } from "../components";
import { notices, noticeTypes, readNoticesAtom } from "../data";

export default function NoticesPage() {
  const [type, setType] = useState("all");
  const setRead = useSetAtom(readNoticesAtom);
  const list = notices.filter((n) => type === "all" || n.type === type);

  return (
    <TplPage tab>
      <TplHeader
        title="Thông báo"
        back={false}
        right={
          <button onClick={() => setRead(notices.map((n) => n.id))} className="text-xs text-gray-500">
            Đọc hết
          </button>
        }
      >
        <ChipRow items={noticeTypes} value={type} onChange={setType} className="pb-2" />
      </TplHeader>
      <div className="mt-3 space-y-2 px-4">
        {list.map((n) => (
          <NoticeCard key={n.id} notice={n} />
        ))}
      </div>
    </TplPage>
  );
}
