import { fmtQuotaMb } from "./format";

export const ACTION_LABEL: Record<string, string> = {
  "oauth.app.create": "Tạo kênh API",
  "oauth.app.update": "Sửa kênh API",
  "oauth.app.disable": "Tắt kênh API",
  "oauth.app.rotate_secret": "Đổi secret kênh",
  "oauth.app.revoke_tokens": "Thu hồi token kênh",
  "oauth.app.delete": "Xoá kênh API",
  "store.update": "Sửa cấu hình store",
  "spam.block.add": "Chặn spam",
  "spam.block.remove": "Bỏ chặn spam",
  "project.create": "Tạo dự án",
  "project.update": "Sửa dự án",
  "project.delete": "Xoá dự án",
  "ticket.update": "Sửa ticket",
  "inbox.conversation.update": "Sửa hội thoại",
  "inbox.file.delete": "Xoá ảnh khách",
  "inbox.oa.credentials": "Đổi token Zalo OA",
  "store.oa.update": "Cập nhật Zalo OA gian hàng",
  "store.oa.disconnect": "Gỡ token OA gian hàng",
  "build.request": "Gửi yêu cầu build Mini App",
  "build.cancel": "Huỷ yêu cầu build",
  "build.approve": "Duyệt yêu cầu build",
  "build.publish": "Phát hành Mini App riêng",
  "build.reject": "Từ chối yêu cầu build",
  "debt.create": "Tạo khoản nợ",
  "debt.update": "Sửa khoản nợ",
  "debt.delete": "Xoá khoản nợ",
  "debt.payment": "Thu tiền nợ",
  "debt.payment_delete": "Huỷ lần thu",
  "customer.create": "Tạo khách hàng",
  "customer.update": "Sửa khách hàng",
  "customer.delete": "Xoá khách hàng",
  "customer.staff.add": "Thêm nhân sự khách",
  "customer.staff.update": "Sửa nhân sự khách",
  "customer.staff.remove": "Xoá nhân sự khách",
  "plan.create": "Tạo gói dịch vụ",
  "plan.update": "Sửa gói dịch vụ",
  "plan.delete": "Xoá gói dịch vụ",
  "plan.storage_quota": "Đổi hạn mức dung lượng gói",
  "plan_voucher.create": "Tạo voucher gói",
  "plan_voucher.update": "Sửa voucher gói",
  "plan_voucher.delete": "Xoá voucher gói",
  "subscription.create": "Tạo đăng ký gói",
  "subscription.update": "Sửa đăng ký gói",
  "store.product.add": "Thêm sản phẩm",
  "store.product.update": "Sửa sản phẩm",
  "store.product.remove": "Xoá sản phẩm",
  "store.customer.add": "Thêm khách của gian hàng",
  "store.customer.update": "Sửa khách của gian hàng",
  "store.customer.remove": "Xoá khách của gian hàng",
  "store.delete": "Xoá gian hàng",
  "store.media.delete": "Xoá ảnh thư viện",
};

/** Nhãn hiển thị cho một dòng nhật ký; action lạ → giữ mã gốc. */
export function auditActionLabel(action: string, meta?: Record<string, unknown> | null): string {
  if (action === "plan.storage_quota" && meta) {
    const q = (v: unknown) => fmtQuotaMb(typeof v === "number" ? v : null);
    return `Đổi hạn mức gói ${meta.name ?? ""}: ${q(meta.fromMb)} → ${q(meta.toMb)}`.replace("gói :", "gói:");
  }
  return ACTION_LABEL[action] ?? action;
}

