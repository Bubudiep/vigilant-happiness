import { useNavigate } from "zmp-ui";

import { CART_BAR_SPACE, CartView, TplHeader, TplPage } from "../../_shared/kit";
import { machineLabel as tableLabel, MY_MACHINE as MY_TABLE, order } from "../data";

export default function OrderPage() {
  const navigate = useNavigate();
  return (
    <TplPage bottomSpace={CART_BAR_SPACE}>
      <TplHeader title="Món đã chọn" />
      <div className="mx-4 mt-3 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-800">
        🖥️ Mang tới <b>{tableLabel(MY_TABLE)}</b> trong 5–10 phút. Trừ vào ví hoặc trả khi rời máy.
      </div>
      <CartView
        store={order}
        aboveNav={false}
        checkoutLabel={`Gọi tới ${tableLabel(MY_TABLE)}`}
        emptyText="Chưa chọn món nào"
        emptyAction="Quay lại menu"
        onEmptyAction={() => navigate(-1)}
      />
    </TplPage>
  );
}
