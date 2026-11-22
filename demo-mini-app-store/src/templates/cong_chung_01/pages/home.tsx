import { useAtomValue } from "jotai";
import { useState } from "react";
import { useNavigate } from "zmp-ui";

import {
  BannerSwiper,
  BookingCard,
  BrandHeader,
  Card,
  formatPrice,
  SearchBox,
  SectionTitle,
  ShortcutGrid,
  TplPage,
  useTplTheme,
} from "../../_shared/kit";
import { NotaryServiceCard } from "../components";
import { bookingsAtom, estimateNotaryFee, notaries, notaryServices, path } from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const theme = useTplTheme();
  const nextBooking = useAtomValue(bookingsAtom).find((b) => b.status === "upcoming");
  const [assetMillion, setAssetMillion] = useState(2500);

  return (
    <TplPage tab>
      <BrandHeader
        logo="🏛️"
        name="VP Công chứng Tâm Đức"
        subtitle="Soạn sẵn hồ sơ · Ký nhanh trong 15 phút"
        variant="solid"
      >
        <SearchBox
          placeholder="Tìm thủ tục: mua bán nhà đất, uỷ quyền, di chúc..."
          onClick={() => navigate(path("/services"))}
        />
      </BrandHeader>

      <BannerSwiper
        banners={[
          {
            eyebrow: "Công chứng trực tuyến",
            title: "Gửi hồ sơ soạn trước qua Zalo",
            subtitle: "Đến văn phòng chỉ việc đối chiếu bản gốc và ký",
            from: "#1e3a8a",
            to: "#1d4ed8",
            emoji: "🏛️",
            cta: "Gửi hồ sơ",
            onClick: () => navigate(path("/service/cc1")),
          },
          {
            eyebrow: "Ngoài trụ sở",
            title: "Công chứng tại nhà & Ngân hàng",
            subtitle: "Hỗ trợ ký tận nơi tại nhà riêng, bệnh viện trong ngày",
            from: "#0f172a",
            to: "#b45309",
            emoji: "✍️",
            cta: "Đặt lịch ký",
            onClick: () => navigate(path("/service/cc2")),
          },
        ]}
      />

      <div className="mt-3">
        <ShortcutGrid
          cols={4}
          items={[
            { emoji: "🏠", label: "Nhà đất", onClick: () => navigate(path("/service/cc1")) },
            { emoji: "✍️", label: "Uỷ quyền", onClick: () => navigate(path("/service/cc2")) },
            { emoji: "📜", label: "Di chúc", onClick: () => navigate(path("/service/cc4")) },
            { emoji: "📑", label: "Sao y", onClick: () => navigate(path("/service/cc6")) },
          ]}
        />
      </div>

      {nextBooking && (
        <div className="mt-3 px-4">
          <BookingCard booking={nextBooking} onClick={() => navigate(path("/bookings"))} />
        </div>
      )}

      {/* Tính nhanh phí công chứng */}
      <div className="mt-3 px-4">
        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900">Ước tính phí công chứng BĐS</span>
            <span className="text-xs font-bold" style={{ color: theme.primary }}>
              Giá trị: {(assetMillion / 1000).toFixed(1)} tỷ
            </span>
          </div>
          <input
            type="range"
            min={100}
            max={10000}
            step={100}
            value={assetMillion}
            onChange={(e) => setAssetMillion(Number(e.target.value))}
            className="w-full accent-blue-900"
          />
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Phí công chứng theo biểu phí nhà nước:</span>
            <span className="text-sm font-bold" style={{ color: theme.primary }}>
              {formatPrice(estimateNotaryFee(assetMillion))}
            </span>
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <SectionTitle
          title="Thủ tục công chứng phổ biến"
          action="Tất cả"
          onAction={() => navigate(path("/services"))}
        />
        <div className="mt-2.5 space-y-2.5 px-4">
          {notaryServices
            .filter((s) => s.popular)
            .map((s) => (
              <NotaryServiceCard key={s.id} service={s} />
            ))}
        </div>
      </div>

      <div className="mt-4">
        <SectionTitle title="Công chứng viên phụ trách" />
        <div className="mt-2.5 space-y-2 px-4">
          {notaries.map((n) => (
            <Card key={n.id} className="flex items-center gap-3 !p-3" onClick={() => navigate(path("/services"))}>
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                style={{ background: theme.primary }}
              >
                CCV
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-gray-900">{n.name}</div>
                <div className="text-xs text-gray-500">{n.title}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </TplPage>
  );
}
