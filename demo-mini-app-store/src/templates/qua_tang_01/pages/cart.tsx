import { useAtom } from "jotai";
import { useState } from "react";
import { useNavigate } from "zmp-ui";

import { CART_BAR_SPACE, CartView, DayPicker, Field, TextArea, TplHeader, TplPage, useTplTheme } from "../../_shared/kit";
import { cart, giftOptionsAtom, path, wrapStyles } from "../data";

export default function CartPage() {
  const navigate = useNavigate();
  const theme = useTplTheme();
  const [opts, setOpts] = useAtom(giftOptionsAtom);
  const [day, setDay] = useState<string>();
  const wrap = wrapStyles.find((w) => w.id === opts.wrap)!;

  return (
    <TplPage tab bottomSpace={CART_BAR_SPACE}>
      <TplHeader title="Giỏ quà" back={false} />
      <CartView
        store={cart}
        checkoutLabel="Đặt quà"
        shippingFee={30000 + wrap.price}
        feeLabel={wrap.price ? "Giao hàng + gói quà" : "Phí giao hàng"}
        emptyText="Giỏ quà đang trống"
        emptyAction="Chọn quà ngay"
        onEmptyAction={() => navigate(path("/shop"), { replace: true, direction: "backward" })}
        extra={
          <div className="mx-4 mt-3 space-y-4 rounded-xl bg-white p-4">
            <div className="text-sm font-semibold">🎀 Tuỳ chọn quà tặng</div>
            <Field label="Kiểu gói quà">
              <div className="space-y-2">
                {wrapStyles.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setOpts({ ...opts, wrap: w.id })}
                    className="flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm"
                    style={{ borderColor: opts.wrap === w.id ? theme.primary : "#e5e7eb" }}
                  >
                    <span
                      className="h-4 w-4 rounded-full border-4"
                      style={{ borderColor: opts.wrap === w.id ? theme.primary : "#d1d5db" }}
                    />
                    {w.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Lời nhắn trên thiệp (viết tay)">
              <TextArea
                value={opts.message}
                maxLength={150}
                onChange={(e) => setOpts({ ...opts, message: e.target.value })}
                placeholder="VD: Chúc mừng sinh nhật em yêu! 💕"
              />
              <div className="mt-1 text-right text-[11px] text-gray-400">{opts.message.length}/150</div>
            </Field>
            <Field label="Ngày giao">
              <DayPicker value={day} onChange={setDay} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={opts.surprise} onChange={(e) => setOpts({ ...opts, surprise: e.target.checked })} />
              Giao bí mật – không ghi tên người gửi & giá tiền
            </label>
          </div>
        }
      />
    </TplPage>
  );
}
