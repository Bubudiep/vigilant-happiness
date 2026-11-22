import { ComponentProps, SyntheticEvent, useEffect, useRef } from "react";
import { Modal as ZModal, Sheet as ZSheet } from "zmp-ui";

/**
 * Vuốt back / nút Back của Android khi đang mở sheet hoặc modal: chỉ đóng sheet, không rời trang
 * (mặc định Zalo coi đó là quay lại trang trước — hoặc thoát luôn Mini App nếu đang ở trang đầu).
 *
 * Cách làm: lúc mở, đẩy thêm 1 mục vào lịch sử trình duyệt (cùng URL nên router không chuyển trang).
 * Back sẽ lấy mục đó ra → bắt sự kiện `popstate` để đóng sheet. Nếu sheet đóng theo cách khác
 * (bấm nền, vuốt xuống, bấm nút) thì tự `history.back()` để xoá mục đã đẩy.
 */
const currentMarker = () => (window.history.state as { __overlay?: string } | null)?.__overlay;

/**
 * Mục lịch sử của sheet vừa đóng (không phải bằng back) đang chờ xoá.
 * Nếu ngay sau đó mở sheet khác (VD đóng menu → mở bảng chia sẻ) thì dùng lại mục này
 * thay vì đẩy mục mới, tránh `history.back()` chạy trễ đóng nhầm sheet mới.
 */
let pendingRelease: string | null = null;

export function useBackToClose(visible: boolean, onClose?: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!visible) return;
    const marker = `overlay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    // Giữ nguyên state của react-router (key/idx) để router coi như vẫn ở trang hiện tại
    const state = { ...(window.history.state ?? {}), __overlay: marker };
    if (pendingRelease && currentMarker() === pendingRelease) {
      window.history.replaceState(state, "");
    } else {
      window.history.pushState(state, "");
    }
    pendingRelease = null;

    let closedByBack = false;
    const onPop = () => {
      // Sheet chồng sheet: back chỉ đóng sheet trên cùng (sheet dưới vẫn khớp state hiện tại)
      if (currentMarker() === marker) return;
      closedByBack = true;
      onCloseRef.current?.();
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      if (closedByBack || currentMarker() !== marker) return;
      // Đóng không phải bằng back → xoá mục lịch sử đã đẩy (để lần back sau không bị "trống").
      // Hoãn 1 nhịp: nếu có sheet khác mở ngay thì nó dùng lại mục này.
      pendingRelease = marker;
      setTimeout(() => {
        if (pendingRelease === marker && currentMarker() === marker) {
          pendingRelease = null;
          window.history.back();
        }
      }, 0);
    };
  }, [visible]);
}

type SheetProps = ComponentProps<typeof ZSheet>;
type ModalProps = ComponentProps<typeof ZModal>;

/** Sheet của zmp-ui + back để đóng. Dùng thay `import { Sheet } from "zmp-ui"`. */
export function Sheet(props: SheetProps) {
  useBackToClose(!!props.visible, () => props.onClose?.({} as SyntheticEvent));
  return <ZSheet {...props} />;
}

/** Modal của zmp-ui + back để đóng. Dùng thay `import { Modal } from "zmp-ui"`. */
export function Modal(props: ModalProps) {
  useBackToClose(!!props.visible, () => props.onClose?.({} as SyntheticEvent));
  return <ZModal {...props} />;
}
