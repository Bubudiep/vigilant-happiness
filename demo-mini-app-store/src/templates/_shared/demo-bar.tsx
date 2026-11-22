import { ReactNode, useState } from "react";
import { LuChevronRight, LuLayoutGrid, LuShare2 } from "react-icons/lu";
import { RiChat3Fill, RiHome5Line } from "react-icons/ri";
import { useNavigate } from "zmp-ui";

import { Sheet } from "@/components/back-aware";
import { company } from "@/data/company";
import type { TemplateMeta } from "@/templates/types";
import ShareSheet from "@/components/share/share-sheet";
import { chatWithCompany } from "@/utils/zalo";

/** `?screenshot=1` lúc mở app: ẩn nút nổi để chụp ảnh thu nhỏ cho danh sách mẫu. */
const HIDE_FOR_SCREENSHOT =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).has("screenshot");

/**
 * Nút nổi "Chọn" hiển thị trên mọi trang của mẫu.
 * Bấm vào mở bảng: tư vấn mẫu này / chia sẻ / xem mẫu khác.
 */
export default function DemoBar({ template }: { template: TemplateMeta }) {
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const navigate = useNavigate();

  if (HIDE_FOR_SCREENSHOT) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-0 z-[60] flex items-center gap-1.5 rounded-l-full bg-brand-600/95 py-3 pl-3.5 pr-2.5 text-xs font-semibold text-white shadow-lg"
        style={{
          bottom: "calc(var(--zaui-safe-area-inset-bottom, 0px) + 140px)",
        }}
      >
        <LuLayoutGrid size={16} />
        Chọn
      </button>

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        autoHeight
        mask
        handler
        swipeToClose
      >
        <div className="px-4 pt-2 safe-bottom">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-600">
            Bản demo · {template.code}
          </div>
          <div className="text-lg font-bold">{template.name}</div>
          <p className="mt-1 text-sm text-gray-500">
            Giao diện mẫu do {company.name} thiết kế. Dữ liệu chỉ để minh hoạ.
          </p>

          <div className="mb-2 mt-4 space-y-2">
            <SheetAction
              icon={<RiChat3Fill size={20} />}
              title="Tư vấn mẫu này"
              text="Nhận báo giá và tuỳ biến theo thương hiệu của bạn"
              primary
              onClick={() => {
                setOpen(false);
                chatWithCompany(
                  `Tôi quan tâm mẫu ${template.code} - ${template.name}`,
                );
              }}
            />
            <SheetAction
              icon={<LuShare2 size={20} />}
              title="Chia sẻ mẫu"
              text="Gửi thẻ Mini App hoặc sao chép link demo"
              onClick={() => {
                setOpen(false);
                setShareOpen(true);
              }}
            />
            <SheetAction
              icon={<RiHome5Line size={20} />}
              title="Xem mẫu khác"
              text={`Về trang giới thiệu của ${company.name}`}
              onClick={() => {
                setOpen(false);
                navigate("/", { direction: "backward" });
              }}
            />
          </div>
        </div>
      </Sheet>

      <ShareSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        template={{
          id: template.id,
          name: template.name,
          code: template.code,
          brand: template.brand,
          description: template.description,
          color: template.color,
          features: template.features,
        }}
      />
    </>
  );
}

function SheetAction(props: {
  icon: ReactNode;
  title: string;
  text: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={props.onClick}
      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ${
        props.primary ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-900"
      }`}
    >
      {props.icon}
      <div className="flex-1">
        <div className="text-sm font-semibold">{props.title}</div>
        <div
          className={`text-xs ${props.primary ? "text-white/80" : "text-gray-500"}`}
        >
          {props.text}
        </div>
      </div>
      <LuChevronRight size={18} />
    </button>
  );
}
