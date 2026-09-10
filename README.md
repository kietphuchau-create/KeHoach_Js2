# 🏥 MedSched - Hệ Thống Quản Lý Đặt Lịch Khám & Tiếp Đón Bệnh Viện Thông Minh

> **Học phần:** Java Spring 2 - Phát triển ứng dụng Web thông minh với Spring Boot & Spring AI  
> **Đề tài:** Topic 01 - MedSched (Phiên bản 2.0)  
> **Công nghệ tích hợp:** Spring Boot 3, Spring AI (ChatClient, Triage, PGVector RAG), PostgreSQL (16/18), Next.js / React.  
> **Trạng thái:** Đã cập nhật toàn diện theo phản hồi của Giảng viên & Kịch bản thực tế bệnh viện (Tập trung trọng tâm vào Spring Boot 3 & Spring AI, loại bỏ YOLO11 để đảm bảo tính khả thi và bám sát chương trình học).

---

## 🎯 Cấu Trúc Hồ Sơ Theo 4 Yêu Cầu Của Giảng Viên

Toàn bộ tài liệu đề tài được sắp xếp ngăn nắp thành **4 thư mục nghiệp vụ** tương ứng chính xác với 4 yêu cầu trên bảng của Giảng viên:

```
📁 3. Đề tài tham khảo/
│
├── 📂 01_List_Feature/          ➔ [1] Danh sách 29 tính năng (F01–F29), phân theo 4 Actor & Ma trận RBAC
│   └── 📄 List_Feature.md
│
├── 📂 02_List_Actor/            ➔ [2] Danh sách 5 tác nhân hệ thống (Bệnh nhân, Lễ tân, Bác sĩ, Admin, Spring AI)
│   └── 📄 List_Actor.md
│
├── 📂 03_Luong_Chinh/           ➔ [3] 7 luồng quy trình chính: Đặt lịch, Check-in 1s QR, Khám bệnh, Review AI,
│   └── 📄 Luong_Nghiep_Vu_Chinh.md   Hàng đợi thông minh (Online vs Walk-in), Cận lâm sàng & 5 Edge Cases.
│
└── 📂 04_Database_Design/       ➔ [4] Thiết kế 12 bảng CSDL PostgreSQL chuẩn 3NF, Full 4 trường Audit,
    ├── 📄 Database_Design.md         mã DDL medsched_schema.sql, hướng dẫn xem ERD DBeaver.
    └── 🗄️ medsched_schema.sql
```

---

## 📑 Bảng Điều Hướng Nhanh Đến Từng Thư Mục

| Thư Mục | Yêu Cầu GV | Nội Dung Chi Tiết Đã Nâng Cấp | Liên Kết |
|:---|:---|:---|:---:|
| 📂 **`01_List_Feature`** | **List feature** | Bổ sung F23 (Hàng đợi điều phối thông minh), F24 (Hồ sơ gia đình), F25 (Lịch sử trạng thái ca khám), F26 (AI Red-flag Guardrails), F27 (Mở rộng SaaS), F28 (Thanh toán quầy & Cọc online), F29 (Cận lâm sàng 2 pha). | [Xem Thư Mục](./01_List_Feature/List_Feature.md) |
| 📂 **`02_List_Actor`** | **List Actor** | 5 tác nhân (Bệnh nhân, Nhân viên tiếp đón, Bác sĩ, Quản trị viên, Hệ thống Trí tuệ nhân tạo Spring AI Engine) kèm trách nhiệm. | [Xem ThVR Thư Mục](./02_List_Actor/List_Actor.md) |
| 📂 **`03_Luong_Chinh`** | **Clear luồng chính** | Bổ sung Thuật toán Hàng đợi ưu tiên (Khách online vs Khách vãng lai 9h30 - 10h00, buffer time 20p), quy trình Cận lâm sàng 2 pha và 5 Kịch bản xử lý sự cố thực tế (Edge Cases). | [Xem Thư Mục](./03_Luong_Chinh/Luong_Nghiep_Vu_Chinh.md) |
| 📂 **`04_Database_Design`** | **Database design (optional)** | Thiết kế 12 bảng quan hệ chuẩn 3NF (bổ sung `medical_centers`, `system_settings`, `patient_profiles`, `appointment_status_logs`), chuẩn hóa 4 trường Audit trên mọi bảng. | [Xem Thư Mục](./04_Database_Design/Database_Design.md) |

---

## 🌐 Các Tài Liệu Tham Khảo Khác
- 📄 [**`De_Xuat_Du_An_MedSched_Nhom.md`**](./De_Xuat_Du_An_MedSched_Nhom.md): Báo cáo đề xuất hoàn chỉnh gồm phân công 6 thành viên và mục **Tiếp thu & Giải trình góp ý của Giảng viên**.
- 🌐 [**`medsched-architecture.html`**](./medsched-architecture.html): Sơ đồ kiến trúc hệ thống tương tác đa chế độ (Đã Việt hóa toàn bộ).
- 🖼️ [**`medsched-architecture.visual-check.1440x900.dark.png`**](./medsched-architecture.visual-check.1440x900.dark.png): Ảnh chụp sơ đồ kiến trúc Dark Mode tiếng Việt chèn Slide/Báo cáo.
- 🖼️ [**`medsched-architecture.visual-check.1440x900.light.png`**](./medsched-architecture.visual-check.1440x900.light.png): Ảnh chụp sơ đồ kiến trúc Light Mode tiếng Việt.
- 🗄️ [**`medsched_schema.sql`**](./medsched_schema.sql): File kịch bản CSDL gốc nạp vào PostgreSQL.

---

## 🚀 Hướng Dẫn Nhanh Chạy Cơ Sở Dữ Liệu
1. Khởi động PostgreSQL (Cổng `5433` qua Docker hoặc `5432` cục bộ, Database: `medsched_db`).
2. Mở **DBeaver**, kết nối vào `medsched_db` và mở file `04_Database_Design/medsched_schema.sql`.
3. Nhấn tổ hợp **`Alt + X`** để nạp toàn bộ 12 bảng và dữ liệu mẫu khởi tạo.
4. Nhấp đúp vào thư mục **Tables** ➔ chọn tab **Diagram** để xem và xuất ảnh sơ đồ quan hệ thực thể (ERD).
