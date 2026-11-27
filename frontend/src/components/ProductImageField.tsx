import { App as AntApp, Button, Input } from "antd";
import { useRef, useState } from "react";
import { LuImage, LuTrash2, LuUpload } from "react-icons/lu";
import { shrinkImage } from "../data/album-api";
import { uploadStoreMedia } from "../data/media-api";
import { ApiError } from "../data/platform-api";

/**
 * Ảnh hiển thị của món (sản phẩm / dịch vụ / combo): tải từ máy hoặc dán URL.
 * Đặt trong Form.Item (nhận value / onChange). Bỏ ảnh → chuỗi rỗng để máy chủ xoá ảnh cũ.
 */
export function ProductImageField({ storeId, value, onChange }: { storeId: string; value?: string; onChange?: (v: string) => void }) {
  const { message } = AntApp.useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file?: File) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return message.warning("Chọn file ảnh JPG, PNG, WebP hoặc GIF");
    setUploading(true);
    try {
      const blob = await shrinkImage(file, 1280);
      if (blob.size > 10 * 1024 * 1024) throw new ApiError("Ảnh lớn hơn 10MB sau khi nén", 413);
      // shrinkImage đổi sang JPEG → đổi đuôi file theo
      const name = blob.type === "image/jpeg" ? file.name.replace(/\.[a-z0-9]+$/i, ".jpg") : file.name;
      onChange?.(await uploadStoreMedia(storeId, blob, name, "product"));
      message.success("Đã tải ảnh lên — bấm Lưu để áp dụng");
    } catch (e) {
      message.error(e instanceof ApiError ? e.message : "Tải ảnh thất bại");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-start gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        // antd Form đặt input[type=file] { display: block } đè class "hidden" → ẩn bằng style
        style={{ display: "none" }}
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {value ? (
        <img src={value} alt="Ảnh hiển thị" className="h-20 w-20 shrink-0 rounded-lg border border-slate-200 object-cover" />
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400">
          <LuImage size={22} />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex gap-2">
          <Button icon={<LuUpload size={14} />} loading={uploading} onClick={() => inputRef.current?.click()}>
            {value ? "Đổi ảnh" : "Tải ảnh lên"}
          </Button>
          {value && (
            <Button danger icon={<LuTrash2 size={14} />} onClick={() => onChange?.("")}>
              Bỏ ảnh
            </Button>
          )}
        </div>
        <Input allowClear placeholder="Hoặc dán URL ảnh (https://…)" value={value ?? ""} onChange={(e) => onChange?.(e.target.value.trim())} />
      </div>
    </div>
  );
}
