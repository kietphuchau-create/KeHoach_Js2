# 🏥 MedSched - Hệ Thống Quản Lý Đặt Lịch Khám & Tiếp Đón Bệnh Viện Thông Minh

> **Học phần:** Java Spring 2 - Phát triển ứng dụng Web thông minh với Spring Boot & AI  
> **Đề tài:** Topic 01 - MedSched  
> **Công nghệ tích hợp:** Spring Boot 3, Spring AI, Ultralytics YOLO11 (Computer Vision), PostgreSQL 16, Next.js / React.

---

## 🎯 Cấu Trúc Hồ Sơ Theo 4 Yêu Cầu Của Giảng Viên

Toàn bộ tài liệu đề tài được sắp xếp ngăn nắp thành **4 thư mục nghiệp vụ** tương ứng chính xác với 4 yêu cầu trên bảng của Giảng viên:

```
📁 3. Đề tài tham khảo/
│
├── 📂 01_List_Feature/          ➔ [1] Danh sách 21 tính năng phân theo Actor & Module AI
│   └── 📄 List_Feature.md
│
├── 📂 02_List_Actor/            ➔ [2] Danh sách 5 tác nhân hệ thống (Bệnh nhân, Lễ tân, Bác sĩ, Admin, AI)
│   └── 📄 List_Actor.md
│
├── 📂 03_Luong_Chinh/           ➔ [3] 3 luồng quy trình chính kèm Sequence Diagram & Sơ đồ kiến trúc
│   └── 📄 Luong_Nghiep_Vu_Chinh.md
│
└── 📂 04_Database_Design/       ➔ [4] Thiết kế 9 bảng CSDL PostgreSQL, mã nguồn DDL & dữ liệu mẫu
    ├── 📄 Database_Design.md
    └── 🗄️ medsched_schema.sql
```

---

## 📑 Bảng Điều Hướng Nhanh Đến Từng Thư Mục

| Thư Mục | Yêu Cầu GV | Nội Dung Chi Tiết | Liên Kết |
|:---|:---|:---|:---:|
| 📂 **`01_List_Feature`** | **List feature** | Chi tiết 21 tính năng (F01–F21), phân loại theo Patient, Receptionist, Doctor, Admin cùng ma trận phân quyền RBAC. | [Xem Thư Mục](./01_List_Feature/List_Feature.md) |
| 📂 **`02_List_Actor`** | **List Actor** | 5 tác nhân (Bệnh nhân, Nhân viên tiếp đón, Bác sĩ, Quản trị viên, Hệ thống AI: Spring AI & YOLO11) kèm trách nhiệm. | [Xem Thư Mục](./02_List_Actor/List_Actor.md) |
| 📂 **`03_Luong_Chinh`** | **Clear luồng chính** | 3 quy trình then chốt: (1) Đặt lịch online + AI tư vấn; (2) Check-in tự động 3s bằng quét CCCD YOLO11; (3) Bác sĩ khám bệnh với bản tóm tắt AI. | [Xem Thư Mục](./03_Luong_Chinh/Luong_Nghiep_Vu_Chinh.md) |
| 📂 **`04_Database_Design`** | **Database design (optional)** | Thiết kế 9 bảng quan hệ chuẩn 3NF, script SQL nạp vào PostgreSQL cổng 5433, hướng dẫn xem ERD trên DBeaver. | [Xem Thư Mục](./04_Database_Design/Database_Design.md) |

---

## 🌐 Các Tài Liệu Tham Khảo Khác
- 📄 [**`De_Xuat_Du_An_MedSched_Nhom.md`**](./De_Xuat_Du_An_MedSched_Nhom.md): Tài liệu đề xuất tổng hợp hoàn chỉnh (dùng in nộp bản cứng hoặc làm Slide thuyết trình).
- 🌐 [**`medsched-architecture.html`**](./medsched-architecture.html): Sơ đồ kiến trúc hệ thống tương tác đa chế độ (Interactive Architecture Diagram).
- 🖼️ [**`medsched-architecture.visual-check.1440x900.dark.png`**](./medsched-architecture.visual-check.1440x900.dark.png): Ảnh chụp sơ đồ kiến trúc hệ thống phục vụ chèn vào báo cáo Word/Slide.
- 🗄️ [**`medsched_schema.sql`**](./medsched_schema.sql): File kịch bản CSDL gốc nạp vào PostgreSQL.

---

## 🚀 Hướng Dẫn Nhanh Chạy Cơ Sở Dữ Liệu
1. Khởi động container PostgreSQL trên cổng **`5433`** (DB: `medsched_db`, User/Pass: `eshop`/`eshop`).
2. Mở **DBeaver**, kết nối vào `medsched_db` và chạy script trong thư mục `04_Database_Design/medsched_schema.sql`.
3. Nhấp đúp vào thư mục **Tables** ➔ chọn tab **Diagram** để xem và xuất ảnh sơ đồ quan hệ thực thể (ERD).
