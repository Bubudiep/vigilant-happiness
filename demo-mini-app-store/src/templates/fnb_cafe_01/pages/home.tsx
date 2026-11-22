import { useAtom } from "jotai";
import { LuMapPin } from "react-icons/lu";
import { useNavigate } from "zmp-ui";

import {
  AddButton,
  BannerSwiper,
  BrandHeader,
  Card,
  formatPrice,
  MemberCard,
  SearchBox,
  SectionTitle,
  Segmented,
  ShortcutGrid,
  Tile,
  TplPage,
  useTplTheme,
} from "../../_shared/kit";
import {
  banners,
  drinks,
  menuCategories,
  orderModeAtom,
  orderModes,
  path,
} from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const theme = useTplTheme();
  const [mode, setMode] = useAtom(orderModeAtom);
  const best = drinks.filter((d) => d.bestSeller);

  return (
    <TplPage tab>
      <BrandHeader logo="☕" name="Mộc Coffee" subtitle="Hôm nay uống gì?" variant="pastel">
        <SearchBox
          placeholder="Tìm món bạn yêu thích..."
          onClick={() => navigate(path("/menu"))}
        />
      </BrandHeader>

      <BannerSwiper
        banners={banners.map((b) => ({
          ...b,
          cta: "Đặt món",
          onClick: () => navigate(path("/menu")),
        }))}
      />

      <div className="mt-3 px-4">
        <Card className="space-y-2.5 !p-3">
          <Segmented options={orderModes} value={mode} onChange={setMode} />
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <LuMapPin size={14} style={{ color: theme.primary }} />
            <span className="truncate">
              {mode === "delivery"
                ? "Giao đến: 12 Nguyễn Huệ, Quận 1"
                : "Cửa hàng: 45 Lê Lợi, Quận 1"}
            </span>
          </div>
        </Card>
      </div>

      <div className="mt-3">
        <ShortcutGrid
          cols={4}
          items={menuCategories.map((c) => ({
            emoji: c.emoji,
            label: c.label,
            onClick: () => navigate(path(`/menu?cat=${c.id}`)),
          }))}
        />
      </div>

      <div className="mt-3">
        <MemberCard
          variant="stamp"
          stampCurrent={5}
          stampTotal={8}
          stampLabel="Tích 8 ly tặng 1 ly miễn phí"
          onClick={() => navigate(path("/account"))}
        />
      </div>

      <div className="mt-4">
        <SectionTitle
          title="Món bán chạy"
          action="Thực đơn"
          onAction={() => navigate(path("/menu"))}
        />
        <div className="no-scrollbar mt-2.5 flex gap-3 overflow-x-auto px-4">
          {best.map((d) => (
            <button
              key={d.id}
              onClick={() => navigate(path(`/item/${d.id}`))}
              className="w-36 shrink-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white text-left shadow-sm"
            >
              <Tile
                seed={d.id}
                emoji={d.emoji}
                color={d.color}
                className="aspect-square w-full"
                rounded=""
                size="text-5xl"
              />
              <div className="p-2.5">
                <div className="truncate text-xs font-semibold text-gray-800">{d.name}</div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: theme.primary }}>
                    {formatPrice(d.price)}
                  </span>
                  <AddButton onClick={() => navigate(path(`/item/${d.id}`))} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </TplPage>
  );
}
