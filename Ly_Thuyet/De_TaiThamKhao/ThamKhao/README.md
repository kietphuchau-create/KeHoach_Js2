# 🏥 MedSched - Hệ Thống Quản Lý Đặt Lịch Khám & Tiếp Đón Bệnh Viện Thông Minh

> **Học phần:** Java Spring 2 - Phát triển ứng dụng Web thông minh với Spring Boot & Spring AI  
> **Đề tài:** Topic 01 - MedSched (Phiên bản 3.0)  
> **Công nghệ tích hợp:** Spring Boot 3, Spring AI (ChatClient, Triage), MySQL / MariaDB (XAMPP), Next.js / React.  
> **Trạng thái:** Đã cập nhật toàn diện theo phản hồi của Giảng viên (loại bỏ YOLO11, tập trung trọng tâm vào Spring Boot 3 & Spring AI, tiếp đón siêu tốc 1s bằng mã QR thẻ CCCD gắn chip). **Bản 3.0** sửa 3 lỗi thiết kế CSDL được phản biện: tài khoản dùng chung cho mọi chi nhánh, bảng thanh toán riêng, và tách đơn thuốc thành bảng chuẩn hóa.

---

## 🎯 Cấu Trúc Hồ Sơ Theo 4 Yêu Cầu Của Giảng Viên

Toàn bộ tài liệu đề tài được sắp xếp ngăn nắp thành **4 thư mục nghiệp vụ** tương ứng chính xác với 4 yêu cầu trên bảng của Giảng viên:

```
ThamKhao/
│
├── 📂 01_List_Feature/          ➔ [1] Danh sách 31 tính năng (F01–F31) & Ma trận phân quyền RBAC
│   ├── 📄 List_Feature.md
│   └── 📄 List_Feature.docx
│
├── 📂 02_List_Actor/            ➔ [2] 5 tác nhân (Bệnh nhân, Lễ tân, Bác sĩ, Admin, Spring AI)
│   ├── 📄 List_Actor.md
│   └── 📄 List_Actor.docx
│
├── 📂 03_Luong_Chinh/           ➔ [3] 7 luồng chính, Hàng đợi Online vs Vãng lai, Cận lâm sàng & 9 Edge Cases
│   ├── 📄 Luong_Nghiep_Vu_Chinh.md
│   └── 📄 Luong_Nghiep_Vu_Chinh.docx
│
└── 📂 04_Database_Design/       ➔ [4] Hồ sơ thiết kế 16 bảng CSDL chuẩn 3NF & DDL duy nhất
    ├── 📄 Database_Design.md         ➔ Báo cáo đặc tả, giải trình 3 lỗi CSDL & kịch bản kiểm thử
    ├── 📄 Database_Design.docx       ➔ Bản Word phục vụ in ấn / nộp báo cáo
    ├── 🗄️ medsched_schema_mysql.sql  ➔ FILE SQL ALL-IN-ONE DUY NHẤT (Tạo DB, 16 bảng & nạp sẵn dữ liệu mẫu)
    ├── 🖼️ medsched_erd_v3.png        ➔ Ảnh sơ đồ quan hệ ERD 16 bảng độ nét cao
    └── 🌐 medsched_erd_v3.html       ➔ File tương tác sơ đồ CSDL
```

---

## 📑 Bảng Điều Hướng Nhanh Đến Từng Thư Mục

| Thư Mục | Yêu Cầu GV | Nội Dung Chi Tiết Đã Nâng Cấp | Liên Kết |
|:---|:---|:---|:---:|
| 📂 **`01_List_Feature`** | **List feature** | Bổ sung F23 (Hàng đợi điều phối thông minh), F24 (Hồ sơ gia đình), F25 (Lịch sử trạng thái ca khám), F26 (AI Red-flag Guardrails), F27 (Mở rộng SaaS), F28 (Thanh toán quầy & Cọc online), F29 (Cận lâm sàng 2 pha), **F30 (1 tài khoản khám mọi chi nhánh)**, **F31 (Danh mục thuốc chi nhánh)**. | [Xem Thư Mục](./01_List_Feature/List_Feature.md) |
| 📂 **`02_List_Actor`** | **List Actor** | 5 tác nhân (Bệnh nhân, Nhân viên tiếp đón, Bác sĩ, Quản trị viên, Hệ thống Trí tuệ nhân tạo Spring AI Engine) kèm trách nhiệm. | [Xem Thư Mục](./02_List_Actor/List_Actor.md) |
| 📂 **`03_Luong_Chinh`** | **Clear luồng chính** | Bổ sung Thuật toán Hàng đợi ưu tiên (Khách online vs Khách vãng lai 9h30 - 10h00, buffer time 20p) kèm **ví dụ điều phối theo từng phút**, quy trình Cận lâm sàng 2 pha và **9 Kịch bản xử lý sự cố thực tế** (Race condition đặt trùng slot, nhầm hồ sơ người thân, hoàn tiền VNPay, bác sĩ đa chi nhánh...). | [Xem Thư Mục](./03_Luong_Chinh/Luong_Nghiep_Vu_Chinh.md) |
| 📂 **`04_Database_Design`** | **Database design (optional)** | **Phiên bản 3.0 — 16 bảng** chuẩn 3NF, full 4 trường Audit. Sửa **3 lỗi thiết kế được phản biện**. Kèm **ảnh ERD** và file SQL duy nhất `medsched_schema_mysql.sql`. | [Xem Thư Mục](./04_Database_Design/Database_Design.md) |

---

## 🌐 Các Tài Liệu Tham Khảo Khác
- 📄 [**`De_Xuat_Du_An_MedSched_Nhom.md`**](./De_Xuat_Du_An_MedSched_Nhom.md): Báo cáo đề xuất hoàn chỉnh gồm phân công 6 thành viên và mục **Tiếp thu & Giải trình góp ý của Giảng viên**.
- 📄 [**`De_Tai_01_MedSched_Tong_Quan.md`**](./De_Tai_01_MedSched_Tong_Quan.md): Tài liệu tóm tắt tổng quan Đề tài 01 MedSched.
- 📁 [**`So_Do_Kien_Truc/`**](./So_Do_Kien_Truc): Thư mục lưu trữ toàn bộ sơ đồ kiến trúc hệ thống:
  - 🌐 [**`medsched-architecture.html`**](./So_Do_Kien_Truc/medsched-architecture.html): Sơ đồ kiến trúc tương tác đa chế độ (Đã Việt hóa).
  - 🖼️ [**`medsched-architecture.visual-check.1440x900.dark.png`**](./So_Do_Kien_Truc/medsched-architecture.visual-check.1440x900.dark.png): Ảnh chụp kiến trúc Dark Mode.
  - 🖼️ [**`medsched-architecture.visual-check.1440x900.light.png`**](./So_Do_Kien_Truc/medsched-architecture.visual-check.1440x900.light.png): Ảnh chụp kiến trúc Light Mode.
- 🗄️ [**`04_Database_Design/medsched_schema_mysql.sql`**](./04_Database_Design/medsched_schema_mysql.sql): Kịch bản CSDL All-In-One duy nhất cho MySQL XAMPP.
- 🖼️ [**`04_Database_Design/medsched_erd_v3.png`**](./04_Database_Design/medsched_erd_v3.png): Ảnh sơ đồ ERD 16 bảng để chèn Slide/Báo cáo.

---

## 🚀 Hướng Dẫn Nhanh Chạy Cơ Sở Dữ Liệu Trong XAMPP
1. Bật **MySQL** trên **XAMPP Control Panel** (cổng `3306`).
2. Mở trình duyệt vào phpMyAdmin: [http://localhost/phpmyadmin](http://localhost/phpmyadmin).
3. Vào tab **Import** (hoặc **SQL**), chọn tệp duy nhất:
   👉 [**`04_Database_Design/medsched_schema_mysql.sql`**](./04_Database_Design/medsched_schema_mysql.sql)
4. Bấm **Go / Thực hiện**. Toàn bộ CSDL `medsched_db`, 16 bảng chuẩn 3NF và dữ liệu mẫu sẽ được tạo lập hoàn chỉnh trong 1 cú click!
