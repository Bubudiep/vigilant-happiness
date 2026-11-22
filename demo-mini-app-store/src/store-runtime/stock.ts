/**
 * Ảnh mẫu dự phòng cho khối sản phẩm khi shop chưa có ảnh — lấy từ web quản trị
 * (FRONTEND_URL/stock/...), backend trả về `assetBase` trong /stores/public/:slug.
 */
export const FREEPIK_STOCK = { retail: { products: [] as string[] } };

export function setStockBase(base: string) {
  FREEPIK_STOCK.retail.products = [1, 2, 3, 4, 5, 6].map((i) => `${base}/stock/retail/prod-${i}.jpg`);
}
