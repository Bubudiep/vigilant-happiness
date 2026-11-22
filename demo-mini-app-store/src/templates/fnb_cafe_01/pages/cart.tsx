import { useAtom } from "jotai";
import { useNavigate } from "zmp-ui";

import { CART_BAR_SPACE, CartView, Segmented, TplHeader, TplPage } from "../../_shared/kit";
import { cart, orderModeAtom, orderModes, path } from "../data";

export default function CartPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useAtom(orderModeAtom);

  return (
    <TplPage tab bottomSpace={CART_BAR_SPACE}>
      <TplHeader title="Đơn hàng của bạn" back={false} />
      <CartView
        store={cart}
        checkoutLabel="Đặt món"
        shippingFee={mode === "delivery" ? 15000 : 0}
        freeShipFrom={mode === "delivery" ? 150000 : undefined}
        emptyText="Bạn chưa chọn món nào"
        emptyAction="Xem thực đơn"
        onEmptyAction={() => navigate(path("/menu"), { replace: true, direction: "backward" })}
        extra={
          <div className="mx-4 mt-3 rounded-xl bg-white p-4">
            <div className="mb-2 text-sm font-semibold">Hình thức nhận</div>
            <Segmented options={orderModes} value={mode} onChange={setMode} />
          </div>
        }
      />
    </TplPage>
  );
}
