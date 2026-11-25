/** Gian hàng gán được cho dự án của một khách: chỉ store của đúng khách đó (không có customerId → tất cả). */
export function storesForCustomer<T extends { customer?: { id: string } | null }>(stores: T[], customerId?: string): T[] {
  return stores.filter((s) => !customerId || s.customer?.id === customerId);
}
