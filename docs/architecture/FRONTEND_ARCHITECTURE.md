# MEDSCHED SYSTEM — FRONTEND ARCHITECTURE & DESIGN SYSTEM GUIDE
> **Hệ Thống Đặt Lịch & Tiếp Đón Y Tế Thông Minh (Next.js 15 + React 19 + TypeScript + Tailwind CSS v4)**  
> **Áp dụng chuẩn kiến trúc Design Tokens & Common Components từ Baseline ITC**

---

## 🛠️ 1. Công nghệ sử dụng

- **Core Framework**: Next.js 15.5 (App Router, Server Components + Client Components)
- **UI Library**: React 19 (Hooks, Suspense, BroadcastChannel)
- **Language**: TypeScript 5.7+ (Strict Typing, Interface Definitions)
- **Styling**: Tailwind CSS v4 + Design Tokens CSS Variables tập trung (`src/app/globals.css`)
- **Icons**: Lucide React (Tree-shakeable, SVG icons)
- **State Management**: React State + BroadcastChannel (Single Tab Lock enforcement) + LocalStorage Synchronization
- **Backend API**: Spring Boot 3 + MySQL + Spring AI

---

## 📂 2. Cấu trúc thư mục mã nguồn chuẩn (`frontend/src/`)

Dự án áp dụng mô hình phân lớp rõ ràng giữa **Modules nghiệp vụ chuyên biệt** và **Shared dùng chung**:

```text
src/
├── app/                        # Next.js 15 App Router (Routing, Layouts, Metadata)
│   ├── globals.css             # HỆ THỐNG DESIGN TOKENS CSS VARIABLES TẬP TRUNG
│   ├── layout.tsx              # Root Layout bọc toàn bộ ứng dụng
│   ├── page.tsx                # Trang chủ Home (HeroCarousel, Giới thiệu)
│   ├── booking/                # Route Đặt lịch trực tuyến
│   ├── doctor/                 # Route Bàn khám Bác sĩ
│   ├── reception/              # Route Quầy tiếp đón & Check-in CCCD
│   ├── my-appointments/        # Route Tra cứu & Lịch hẹn của tôi
│   ├── admin/                  # Route Quản trị viên
│   ├── login/ & register/      # Route Xác thực & Đăng nhập
│   └── profile/                # Route Thông tin người dùng
│
├── modules/                    # Phân hệ nghiệp vụ theo từng chức năng lớn
│   ├── appointment/            # Module đặt lịch (BookingForm, MyAppointmentsView)
│   ├── doctor/                 # Module bàn khám bác sĩ (DoctorClinicView)
│   ├── reception/              # Module quầy tiếp đón (ReceptionView, CCCD Reader)
│   ├── auth/                   # Module đăng nhập/đăng ký (LoginForm, RegisterForm)
│   └── home/                   # Module trang chủ (HeroCarousel)
│
├── shared/                     # Tầng dùng chung toàn dự án
│   ├── components/
│   │   ├── common/             # THƯ VIỆN UI CHUẨN: Badge, Card, Button, Table
│   │   ├── Feedback/           # AlertMessage, LoadingSpinner, SingleTabLockOverlay
│   │   └── HeaderNav/          # Header, Navbar dùng chung
│   ├── hooks/                  # Custom Hooks (useSingleTabLock, v.v.)
│   ├── lib/
│   │   ├── api.ts              # API Client kết nối Spring Boot Backend
│   │   └── formatters.ts       # Định dạng tiền tệ VNĐ, ngày tháng, CCCD, SĐT
│   └── types/                  # Định nghĩa kiểu dữ liệu TypeScript tập trung
│       └── index.ts            # UserSession, PatientQueueItem, AppointmentResponse...
```

---

## 🎨 3. Hệ thống Design Tokens (`globals.css`)

Tất cả các màu sắc, bo góc, hiệu ứng chuyển động đều được quy chuẩn:

| Token | Class Tailwind | Ý nghĩa / Ứng dụng |
| :--- | :--- | :--- |
| `--color-primary` | `bg-primary`, `text-primary` | Màu thương hiệu y tế (#0E5C55 Pine Teal) |
| `--color-success` | `bg-success`, `text-success` | Trạng thái ĐÃ KHÁM, Hoàn tất (#059669 Emerald) |
| `--color-warning` | `bg-warning`, `text-warning` | Trạng thái ĐANG CHỜ, Cảnh báo (#D97706 Amber) |
| `--color-danger` | `bg-danger`, `text-danger` | Trạng thái HỦY, Cấp cứu, Lỗi (#DC2626 Rose) |
| `--color-info` | `bg-info`, `text-info` | Trạng thái Thông tin, Hướng dẫn (#0284C7 Sky) |
| `--color-purple` | `bg-purple`, `text-purple` | Trạng thái Trợ lý Spring AI (#7C3AED Purple) |

---

## 🧩 4. Thư viện Common Components (`src/shared/components/common/`)

Mọi thành viên khi xây dựng giao diện mới được khuyến nghị sử dụng các Component chuẩn sau:

### 1. `Badge` (Huy hiệu trạng thái)
```tsx
import { Badge } from '@/shared/components/common';

<Badge variant="success" size="sm" withDot>ĐÃ KHÁM</Badge>
<Badge variant="warning" size="md">ĐANG CHỜ</Badge>
<Badge variant="purple" size="sm" withDot>Spring AI Beta</Badge>
```

### 2. `Card` (Thẻ nội dung chuẩn)
```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/shared/components/common';

<Card hoverEffect>
  <CardHeader>
    <CardTitle>Bệnh án điện tử</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Nội dung chẩn đoán...</p>
  </CardContent>
  <CardFooter>
    <button>Xem chi tiết</button>
  </CardFooter>
</Card>
```

### 3. `Button` (Nút bấm chuẩn)
```tsx
import { Button } from '@/shared/components/common';
import { Calendar } from 'lucide-react';

<Button variant="primary" size="md" icon={<Calendar size={16} />}>
  Đặt Lịch Ngay
</Button>
<Button variant="danger" size="sm" isLoading={isDeleting}>
  Hủy Ca Khám
</Button>
```

### 4. `Table` (Bảng dữ liệu chuẩn)
```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/common';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>STT</TableHead>
      <TableHead>Họ và Tên</TableHead>
      <TableHead>Trạng Thái</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className="font-bold">#01</TableCell>
      <TableCell>Nguyễn Văn A</TableCell>
      <TableCell><Badge variant="success">ĐÃ KHÁM</Badge></TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

## 🚀 5. Hướng dẫn thêm màn hình / module mới

Khi cần phát triển thêm tính năng mới:
1. **Định nghĩa kiểu dữ liệu** trong `src/shared/types/index.ts`.
2. **Khai báo hàm API** trong `src/shared/lib/api.ts`.
3. **Tạo View Component** trong thư mục tương ứng `src/modules/<tên_tính_năng>/components/`.
4. **Đăng ký Route** trong Next.js App Router bằng cách tạo folder `src/app/<route_name>/page.tsx`.
5. **Tận dụng Common Components** (`Badge`, `Card`, `Button`, `Table`) và `formatters` để giữ giao diện đồng nhất.
