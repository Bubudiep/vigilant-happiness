import { DatePicker, Select } from "antd";
import type { SelectProps } from "antd";
import type { RangePickerProps } from "antd/es/date-picker";
import type { ReactNode } from "react";

/**
 * Thanh lọc — thứ tự CỐ ĐỊNH:
 *   [tìm kiếm (co giãn, min 240)] → [bộ lọc: FilterSelect 160 / FilterRange 260 / Segmented] → khoảng trống →
 *   [hành động: Xuất file, Làm mới, cuối cùng là nút chính "Thêm …"].
 * Mobile: tìm kiếm full width; hàng dưới gồm bộ lọc (co giãn) + nút hành động (dồn phải) trên cùng một hàng.
 */
export function FilterBar({ search, filters, actions, className = "" }: { search?: ReactNode; filters?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={`mb-4 flex flex-wrap items-center gap-2 ${className}`}>
      {search && <div className="w-full sm:w-auto sm:min-w-[240px] sm:max-w-sm sm:flex-1">{search}</div>}
      {filters && <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:flex-none">{filters}</div>}
      {actions && <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
    </div>
  );
}

/** Select lọc rộng 160 (mobile: co giãn, tối thiểu 120). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FilterSelect(props: SelectProps<any>) {
  return <Select popupMatchSelectWidth={false} {...props} className={`min-w-[120px] flex-1 sm:!w-40 sm:flex-none ${props.className ?? ""}`} />;
}

/** RangePicker lọc rộng 260. */
export function FilterRange(props: RangePickerProps) {
  return <DatePicker.RangePicker {...props} className={`w-full sm:!w-[260px] ${props.className ?? ""}`} />;
}
