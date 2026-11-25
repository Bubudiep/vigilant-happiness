import { useMemo } from "react";
import type { StoreConfig } from "../data/store-api";
import { BuilderSchema, createSchemaFromPreset, guessPresetId, MiniAppBuilder } from "../miniapp-builder";

/**
 * Trình thiết kế Mini App của một store (tải riêng — chỉ khi mở mục "Miniapp").
 * Store chưa có thiết kế thì dựng sẵn từ mẫu giao diện đã chọn.
 */
export default function MiniAppStudio({
  store,
  previewUrl,
  onPublish,
  onChange,
}: {
  store: StoreConfig;
  previewUrl: string;
  onPublish: () => void;
  onChange: (schema: BuilderSchema) => void;
}) {
  // Chỉ tính một lần cho mỗi store: MiniAppBuilder giữ state riêng sau khi mở
  const initialSchema = useMemo<BuilderSchema>(
    () =>
      store.builder ??
      createSchemaFromPreset(guessPresetId(store.templateId), store.name, {
        primary: store.theme.primary,
        accent: store.theme.accent,
        bg: store.theme.bg,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.id],
  );

  return (
    <MiniAppBuilder
      storeId={store.id}
      brand={store.name}
      initialSchema={initialSchema}
      products={store.products}
      documents={store.documents}
      vouchers={store.vouchers}
      previewUrl={previewUrl}
      onPublish={onPublish}
      onChange={onChange}
    />
  );
}
