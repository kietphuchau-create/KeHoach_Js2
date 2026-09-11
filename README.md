# 🏥 MedSched - Hệ Thống Quản Lý Đặt Lịch Khám & Tiếp Đón Bệnh Viện Thông Minh

> **Học phần:** Java Spring 2 - Phát triển ứng dụng Web thông minh với Spring Boot & Spring AI  
> **Đề tài:** Topic 01 - MedSched (Phiên bản 3.0)  
> **Công nghệ tích hợp:** Spring Boot 3, Spring AI (ChatClient, Triage, PGVector RAG), PostgreSQL (16/18), Next.js / React.  
> **Trạng thái:** Đã cập nhật toàn diện theo phản hồi của Giảng viên & Kịch bản thực tế bệnh viện (Tập trung trọng tâm vào Spring Boot 3 & Spring AI, loại bỏ YOLO11 để đảm bảo tính khả thi và bám sát chương trình học). **Bản 3.0** sửa tiếp 3 lỗi thiết kế CSDL được phản biện: tài khoản dùng chung cho mọi chi nhánh, bảng thanh toán riêng, và tách đơn thuốc thành bảng thay vì cột TEXT.

---

## 🎯 Cấu Trúc Hồ Sơ Theo 4 Yêu Cầu Của Giảng Viên

Toàn bộ tài liệu đề tài được sắp xếp ngăn nắp thành **4 thư mục nghiệp vụ** tương ứng chính xác với 4 yêu cầu trên bảng của Giảng viên:

```
📁 3. Đề tài tham khảo/
│
├── 📂 01_List_Feature/          ➔ [1] Danh sách 31 tính năng (F01–F31), phân theo 4 Actor & Ma trận RBAC
│   └── 📄 List_Feature.md
│
├── 📂 02_List_Actor/            ➔ [2] Danh sách 5 tác nhân hệ thống (Bệnh nhân, Lễ tân, Bác sĩ, Admin, Spring AI)
│   └── 📄 List_Actor.md
│
├── 📂 03_Luong_Chinh/           ➔ [3] 7 luồng quy trình chính: Đặt lịch, Check-in 1s QR, Khám bệnh, Review AI,
│   └── 📄 Luong_Nghiep_Vu_Chinh.md   Hàng đợi thông minh (Online vs Walk-in), Cận lâm sàng & 9 Edge Cases.
│
└── 📂 04_Database_Design/       ➔ [4] Thiết kế 16 bảng CSDL chuẩn 3NF, Full 4 trường Audit, mã DDL
    ├── 📄 Database_Design.md         cho PostgreSQL + MySQL/XAMPP, ERD vẽ lại, và mục 0 giải trình
    ├── 🗄️ medsched_schema.sql        3 lỗi thiết kế đã sửa (tài khoản đa chi nhánh, bảng thanh
    ├── 🗄️ medsched_schema_mysql_xampp.sql   toán, tách đơn thuốc).
    ├── 🖼️ medsched_erd_v3.png        ➔ Ảnh sơ đồ ERD 16 bảng (chèn slide/báo cáo)
    └── 🌐 medsched_erd_v3.html       ➔ File nguồn sơ đồ (sinh tự động từ SQL)
```

---

## 📑 Bảng Điều Hướng Nhanh Đến Từng Thư Mục

| Thư Mục | Yêu Cầu GV | Nội Dung Chi Tiết Đã Nâng Cấp | Liên Kết |
|:---|:---|:---|:---:|
| 📂 **`01_List_Feature`** | **List feature** | Bổ sung F23 (Hàng đợi điều phối thông minh), F24 (Hồ sơ gia đình), F25 (Lịch sử trạng thái ca khám), F26 (AI Red-flag Guardrails), F27 (Mở rộng SaaS), F28 (Thanh toán quầy & Cọc online), F29 (Cận lâm sàng 2 pha), **F30 (1 tài khoản khám mọi chi nhánh)**, **F31 (Danh mục thuốc chi nhánh)**. | [Xem Thư Mục](./01_List_Feature/List_Feature.md) |
| 📂 **`02_List_Actor`** | **List Actor** | 5 tác nhân (Bệnh nhân, Nhân viên tiếp đón, Bác sĩ, Quản trị viên, Hệ thống Trí tuệ nhân tạo Spring AI Engine) kèm trách nhiệm. | [Xem ThVR Thư Mục](./02_List_Actor/List_Actor.md) |
| 📂 **`03_Luong_Chinh`** | **Clear luồng chính** | Bổ sung Thuật toán Hàng đợi ưu tiên (Khách online vs Khách vãng lai 9h30 - 10h00, buffer time 20p) kèm **ví dụ điều phối theo từng phút**, quy trình Cận lâm sàng 2 pha và **9 Kịch bản xử lý sự cố thực tế** (Race condition đặt trùng slot, nhầm hồ sơ người thân, hoàn tiền VNPay, bác sĩ đa chi nhánh...). | [Xem Thư Mục](./03_Luong_Chinh/Luong_Nghiep_Vu_Chinh.md) |
| 📂 **`04_Database_Design`** | **Database design (optional)** | **Phiên bản 3.0 — 16 bảng** chuẩn 3NF, full 4 trường Audit. Sửa **3 lỗi thiết kế được phản biện**: (1) tài khoản không còn bị khóa vào 1 phòng khám — 1 account khám được mọi chi nhánh, quyền nhân sự tách sang `user_medical_center_roles`; (2) thêm bảng `payments` đúng nghĩa; (3) tách `medicines` + `prescription_items` thay cột `prescription TEXT`. Có bản DDL cho PostgreSQL **và** MySQL/XAMPP (đã kiểm thử thật trên cả hai) kèm **ảnh ERD vẽ lại**. | [Xem Thư Mục](./04_Database_Design/Database_Design.md) |

---

## 💡 Ý Tưởng Cá Nhân (Không thuộc 4 yêu cầu bắt buộc của Giảng viên)

| Thư Mục | Tác giả | Nội Dung | Liên Kết |
|:---|:---|:---|:---:|
| 📂 **`05_Y_Tuong_Database_Tai`** | Lê Thành Tài | Prototype code thật (Spring Boot + 16 JPA Entity + Flyway migration cho cả Postgres lẫn MySQL/XAMPP) minh họa cách 16 bảng ở mục [4] trở thành tầng persistence, viết theo đúng convention đã đọc từ repo Hexagonal Architecture tham khảo của nhóm. Chỉ là đề xuất cá nhân của phần CSDL, chưa đụng đến use case/controller/AI/frontend của các thành viên khác. | [Xem Thư Mục](./05_Y_Tuong_Database_Tai/README.md) |

---

## 🌐 Các Tài Liệu Tham Khảo Khác
- 📄 [**`De_Xuat_Du_An_MedSched_Nhom.md`**](./De_Xuat_Du_An_MedSched_Nhom.md): Báo cáo đề xuất hoàn chỉnh gồm phân công 6 thành viên và mục **Tiếp thu & Giải trình góp ý của Giảng viên**.
- 🌐 [**`medsched-architecture.html`**](./medsched-architecture.html): Sơ đồ kiến trúc hệ thống tương tác đa chế độ (Đã Việt hóa toàn bộ).
- 🖼️ [**`medsched-architecture.visual-check.1440x900.dark.png`**](./medsched-architecture.visual-check.1440x900.dark.png): Ảnh chụp sơ đồ kiến trúc Dark Mode tiếng Việt chèn Slide/Báo cáo.
- 🖼️ [**`medsched-architecture.visual-check.1440x900.light.png`**](./medsched-architecture.visual-check.1440x900.light.png): Ảnh chụp sơ đồ kiến trúc Light Mode tiếng Việt.
- 🗄️ [**`medsched_schema.sql`**](./medsched_schema.sql): File kịch bản CSDL gốc nạp vào PostgreSQL.
- 🖼️ [**`04_Database_Design/medsched_erd_v3.png`**](./04_Database_Design/medsched_erd_v3.png): Ảnh sơ đồ ERD 16 bảng (sinh tự động từ chính file SQL) để chèn Slide/Báo cáo.

---

## 🚀 Hướng Dẫn Nhanh Chạy Cơ Sở Dữ Liệu

### Phương án 1 — PostgreSQL (chính thức nộp báo cáo)
1. Khởi động PostgreSQL (Cổng `5433` qua Docker hoặc `5432` cục bộ, Database: `medsched_db`).
2. Mở **DBeaver**, kết nối vào `medsched_db` và mở file `04_Database_Design/medsched_schema.sql`.
3. Nhấn tổ hợp **`Alt + X`** để nạp toàn bộ 16 bảng và dữ liệu mẫu khởi tạo.
4. Nhấp đúp vào thư mục **Tables** ➔ chọn tab **Diagram** để xem và xuất ảnh sơ đồ quan hệ thực thể (ERD).

### Phương án 2 — XAMPP / MySQL / MariaDB (chạy nhanh offline, không cần Docker)
1. Mở **XAMPP Control Panel** ➔ **Start** dòng `MySQL` (và `Apache` để dùng phpMyAdmin qua trình duyệt).
2. Vào `http://localhost/phpmyadmin` ➔ tab **Import** ➔ chọn file `04_Database_Design/medsched_schema_mysql_xampp.sql` ➔ **Go**.
3. Script tự tạo database `medsched_db`, nạp đủ 16 bảng + 25 khóa ngoại + dữ liệu mẫu (đã kiểm thử thực tế trên MariaDB 10.4 **và** PostgreSQL 18, không phát sinh lỗi).
4. Vào **Structure ➔ Designer** để xem sơ đồ ERD, hoặc xem [ảnh ERD 16 bảng](./04_Database_Design/medsched_erd_v3.png) và bản vẽ Mermaid trong [`Database_Design.md`](./04_Database_Design/Database_Design.md).
