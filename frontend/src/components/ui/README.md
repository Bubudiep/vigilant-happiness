# Tên các phần giao diện quản trị

Dùng tên này khi nhờ sửa, ví dụ "SidebarGroupLabel nhỏ lại" hoặc "StatCard bỏ viền".
Mỗi phần có thuộc tính `data-ui="<Tên>"`. Mở F12 → Elements rồi tìm `data-ui="…"` là thấy đúng chỗ trên trang.

## Khung trang (`AdminShell.tsx`), dùng chung cho /admin và /controller

```
┌─ TopBar ──────────┬─ TopBarCenter ─────────────────────────────────────┐
│ TopBarBrand       │ Breadcrumbs          QuickSearchButton  TopBarRight │
├─ Sidebar ─────────┼─ PageContent ──────────────────────────────────────┤
│ SidebarHeader     │ SectionTabs   (chỉ ở mục gộp)                       │
│ SidebarNav        │                                                     │
│  SidebarGroup     │ PageHeader                                          │
│   SidebarGroupLabel│ StatCard · StatCard · …                            │
│   SidebarItem     │ SectionCard / FilterBar / bảng …                    │
│    SidebarBadge   │                                                     │
│ SidebarFooter     │                                                     │
└───────────────────┴─────────────────────────────────────────────────────┘
```

| Tên | Là gì | File |
|---|---|---|
| `AdminShell` | Cả khung trang quản trị | `ui/AdminShell.tsx` |
| `TopBar` | Thanh trên cùng, cao 48px | `ui/AdminShell.tsx` |
| `TopBarBrand` | Ô trái thanh trên, rộng bằng Sidebar: logo + nút thu gọn menu | `ui/AdminShell.tsx` |
| `TopBarCenter` | Giữa thanh trên: Breadcrumbs bên trái, QuickSearchButton bên phải | `ui/AdminShell.tsx` |
| `TopBarLogo` | Logo và nhãn "Quản trị cửa hàng" / "Trang điều hành" | `ui/AdminShell.tsx` (nội dung ở StoreConsole / PlatformConsole) |
| `QuickSearchButton` | Ô "Tìm mục, chuyển trang… Ctrl K" | `ui/AdminShell.tsx` |
| `TopBarRight` | Góc phải: trạng thái lưu, tài khoản | `ui/AdminShell.tsx` |
| `CommandPalette` | Hộp tìm nhanh mở bằng Ctrl K | `ui/AdminShell.tsx` |
| `Sidebar` | Cột menu trái trên máy tính | `ui/AdminShell.tsx` |
| `MobileSidebar` | Menu trái dạng ngăn kéo trên điện thoại | `ui/AdminShell.tsx` |
| `SidebarHeader` | Đầu menu trái, chỗ chọn cửa hàng | `ui/AdminShell.tsx` + `StoreSwitcher.tsx` |
| `SidebarNav` | Toàn bộ danh sách menu | `ui/AdminShell.tsx` |
| `SidebarGroup` | Một nhóm menu | `ui/AdminShell.tsx` |
| `SidebarGroupLabel` | Tên nhóm: "Vận hành", "Hàng hoá & nhân sự", "Khách hàng"… | `ui/AdminShell.tsx` |
| `SidebarItem` | Một mục menu | `ui/AdminShell.tsx` |
| `SidebarActiveIndicator` | Khối nền xanh có vạch trái, trượt tới mục đang chọn | `ui/AdminShell.tsx` |
| `SidebarBadge` | Số đếm bên phải mục menu | `ui/AdminShell.tsx` |
| `SidebarFooter` | Cuối menu trái, chỗ bật/tắt Mini App | `ui/AdminShell.tsx` (nội dung ở StoreConsole) |
| `PageContent` | Vùng nội dung bên phải | `ui/AdminShell.tsx` |
| `Breadcrumbs` | Đường dẫn vị trí trên TopBar (điện thoại: đầu nội dung), ví dụ "Cửa hàng › Thư viện › Tài liệu" | `ui/AdminShell.tsx` |

## Thành phần dùng trong trang (`components/ui/`)

| Tên | Là gì | File |
|---|---|---|
| `SectionTabs` | Tab đầu trang của mục gộp, ví dụ Album ảnh · Kho ảnh · Tài liệu | `ui/SectionTabs.tsx` |
| `PageHeader` | Tiêu đề và mô tả của trang hoặc khối | `ui/PageHeader.tsx` |
| `StatCard` | Thẻ số liệu: nhãn nhỏ, số to, dòng chú thích | `ui/StatCard.tsx` |
| `SectionCard` | Khối nội dung có viền | `ui/SectionCard.tsx` |
| `FilterBar` | Hàng ô tìm kiếm và bộ lọc phía trên bảng | `ui/FilterBar.tsx` |

## Bán hàng tại bàn (`StorePosViews.tsx`)

| Tên | Là gì |
|---|---|
| `PosPayFooter` | Các nút cuối hộp thanh toán: Thanh toán (bàn chuyển "Đang dọn") · Thanh toán & dọn bàn (bàn trống ngay) |

## Cỡ chữ (chỉ áp dụng ở trang quản trị)

| Lớp | Cỡ | Dùng cho |
|---|---|---|
| `text-3xs` | 8px | Nhãn thẻ số liệu |
| `text-2xs` | 9px | Chú thích, đường dẫn vị trí |
| `text-xs` | 10px | Mục menu, tên nhóm menu (SidebarGroupLabel), chữ phụ |
| `text-sm` | 11px | Nội dung chính |
| `text-base` | 12px | Tiêu đề khối |
| `text-lg` | 14px | Tiêu đề trang |

## CSS tuỳ chỉnh antd

Ghi đè giao diện antd viết ở `frontend/src/styles/antd-custom.css`, ví dụ nút `size="small"` cao 28px.
