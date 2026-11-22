import { atom, useAtom, useSetAtom } from "jotai";

import { Modal } from "@/components/back-aware";
import { company } from "@/data/company";
import { chatWithCompany } from "@/utils/zalo";

interface DemoActionState {
  visible: boolean;
  action?: string;
}

const demoActionAtom = atom<DemoActionState>({ visible: false });

/**
 * Dùng cho mọi hành động "thật" trong mẫu demo (thanh toán, đặt hàng, gửi form...).
 *   const demoAction = useDemoAction();
 *   <Button onClick={() => demoAction("Thanh toán")} />
 */
export function useDemoAction() {
  const set = useSetAtom(demoActionAtom);
  return (action?: string) => set({ visible: true, action });
}

/** Đặt một lần ở layout gốc. */
export function DemoActionModal() {
  const [state, setState] = useAtom(demoActionAtom);
  const close = () => setState({ visible: false });

  return (
    <Modal
      visible={state.visible}
      title="Đây là bản demo"
      description={`${state.action ? `Tính năng "${state.action}" ` : "Tính năng này "}sẽ hoạt động đầy đủ khi ${company.name} triển khai Mini App cho bạn.`}
      onClose={close}
      actions={[
        { text: "Để sau", onClick: close },
        {
          text: "Tư vấn ngay",
          highLight: true,
          onClick: () => {
            close();
            chatWithCompany("Tôi muốn tư vấn làm Mini App");
          },
        },
      ]}
    />
  );
}
