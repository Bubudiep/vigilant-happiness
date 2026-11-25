import { DatePicker, Select } from "antd";
import type { SelectProps } from "antd";
import type { RangePickerProps } from "antd/es/date-picker";
import type { ReactNode } from "react";

/**
 * Thanh lọc — thứ tự CỐ ĐỊNH:
 *   [tìm kiếm (co giãn, min 240)] → [bộ lọc: FilterSelect 160 / FilterRange 260 / Segmented] → khoảng trống →
 *   [hành động: Xuất file, Làm mới, cuối cùng là nút chính "Thêm …"].
 * Mobile: tìm kiếm full width, bộ lọc xếp 2 cột, hành động xuống dòng.
 */
export function FilterBar({ search, filters, actions, className = "" }: { search?: ReactNode; filters?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={`mb-4 flex flex-wrap items-center gap-2 ${className}`}>
      {search && <div className="w-full sm:min-w-[240px] sm:max-w-sm sm:flex-1">{search}</div>}
      {filters && <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">{filters}</div>}
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">{actions}</div>}
    </div>
  );
}

/** Select lọc rộng 160 (mobile: full ô lưới). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FilterSelect(props: SelectProps<any>) {
  return <Select popupMatchSelectWidth={false} {...props} className={`w-full sm:!w-40 ${props.className ?? ""}`} />;
}

/** RangePicker lọc rộng 260. */
export function FilterRange(props: RangePickerProps) {
  return <DatePicker.RangePicker {...props} className={`col-span-2 w-full sm:!w-[260px] ${props.className ?? ""}`} />;
}
