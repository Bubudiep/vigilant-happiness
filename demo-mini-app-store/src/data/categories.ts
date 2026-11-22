export type CategoryId =
  | "retail"
  | "fashion"
  | "fnb"
  | "supermarket"
  | "mom_baby"
  | "spa"
  | "health"
  | "education"
  | "hotel"
  | "real_estate"
  | "gov"
  | "legal"
  | "enterprise"
  | "entertainment";

export const categories: { id: CategoryId; label: string }[] = [
  { id: "retail", label: "Bán lẻ" },
  { id: "fashion", label: "Thời trang" },
  { id: "fnb", label: "F&B" },
  { id: "supermarket", label: "Siêu thị" },
  { id: "mom_baby", label: "Mẹ & Bé" },
  { id: "spa", label: "Spa / Salon" },
  { id: "health", label: "Y tế" },
  { id: "education", label: "Giáo dục" },
  { id: "hotel", label: "Du lịch / Khách sạn" },
  { id: "real_estate", label: "Bất động sản" },
  { id: "gov", label: "Cơ quan" },
  { id: "legal", label: "Pháp lý / Luật" },
  { id: "enterprise", label: "Doanh nghiệp / KCN" },
  { id: "entertainment", label: "Giải trí" },
];

export function categoryLabel(id: CategoryId): string {
  return categories.find((c) => c.id === id)?.label ?? id;
}
