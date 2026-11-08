# 🏥 DỰ ÁN CAPSTONE: HỆ THỐNG Y TẾ THÔNG MINH MEDSCHED
## Developing Smart Web Apps with Spring Boot & AI

> **Đơn vị đào tạo:** Khóa học Java Spring 2 – Spring Boot & AI  
> **Kiến trúc:** Clean / Hexagonal Architecture (Ports & Adapters)  
> **Backend:** Spring Boot 3.4.3 (Java 21, Multi-module Gradle: `core` & `app`, Spring Security JWT, Spring AI)  
> **Frontend:** Next.js 15+ (React 19, TypeScript, Tailwind CSS, Lucide Icons)  
> **Cơ sở dữ liệu:** **XAMPP (MySQL / MariaDB – Cổng mặc định 3306) + phpMyAdmin** (23 bảng chuẩn hóa 3NF)  

---

## 👥 1. BẢNG PHÂN CÔNG NHIỆM VỤ NHÓM (6 THÀNH VIÊN — LỚP CD25CT_CLC)

| STT | MSSV | Họ và tên | Vai trò | Nhiệm vụ chính phụ trách | Thư mục làm việc trọng tâm |
| :---: | :---: | :--- | :---: | :--- | :--- |
| **1** | **506250495** | **Châu Tuấn Kiệt** | **Leader / Architect** | Quản lý tiến độ dự án, thiết kế kiến trúc Hexagonal toàn hệ thống, điều phối tích hợp API, CI/CD và báo cáo đồ án. | `backend/core/port`, `README.md`, `.github/` |
| **2** | **501250367** | **Nguyễn Văn Hiếu** | **Backend Dev** | Phát triển Use Cases lõi, Time-slots engine, khóa lạc quan CAS Concurrency, xuất PDF đơn thuốc và bảo mật Spring Security JWT. | `backend/core/usecase`, `backend/app/adapter/in/web` |
| **3** | **501250471** | **Lê Thành Tài** | **Database / Persistence** | Chuẩn hóa CSDL 23 bảng 3NF, tính toàn vẹn dữ liệu, tối ưu hóa truy vấn JPA, quản lý seed data và migration scripts. | `backend/app/adapter/out/persistence`, `database/` |
| **4** | **501250114** | **Huỳnh Thị Kim Trang** | **Frontend Dev** | Xây dựng giao diện Next.js 15, tối ưu UX responsive, kết nối REST API, quản lý state đặt khám và phân quyền 4 Roles. | `frontend/` |
| **5** | **501250145** | **Nguyễn Thị Yến Nhi** | **Business Analyst (BA)** | Đặc tả tài liệu phân tích SRS, xây dựng ma trận kịch bản Test Cases, quy trình tiếp đón và kiểm thử nghiệm thu UAT. | `docs/`, kịch bản nghiệm thu |
| **6** | **501250392** | **Trần Nhật Tân** | **AI Engineer / QA** | Tích hợp Spring AI ChatClient, Prompt Engineering phân loại chuyên khoa (Triage), chatbot RAG hỗ trợ và kiểm thử tải JMeter. | `backend/app/adapter/out/ai` |

---

## 📂 2. CẤU TRÚC THƯ MỤC DỰ ÁN

```
DuAnChinhThuc/
│
├── 📂 Source_code/           ➔ [TOÀN BỘ MÃ NGUỒN DỰ ÁN]
│   ├── 📂 backend/           ➔ Spring Boot 3 & Java 21 (Multi-module Gradle: core + app)
│   ├── 📂 frontend/          ➔ Next.js 15+ (React 19, TypeScript, Tailwind CSS, Lucide Icons)
│   ├── 📂 database/          ➔ File kịch bản CSDL medsched_db.sql duy nhất (23 bảng + seed data chuẩn)
│   └── ⚡ start_all.bat      ➔ Khởi chạy song song Backend + Frontend 1-Click tự mở trình duyệt
│
├── 📂 docs/                  ➔ [TOÀN BỘ HỒ SƠ TÀI LIỆU DỰ ÁN]
│   ├── 📂 01_KeHoach_BaoCao/ ➔ Báo cáo tiến độ phân chia công việc các tuần
│   ├── 📂 02_PhanTich_ThietKe/ ➔ Tài liệu SRS, sơ đồ ca sử dụng UCD, kiến trúc Hexagonal
│   ├── 📂 03_CoSoDuLieu/     ➔ Thiết kế CSDL 23 bảng, từ điển dữ liệu Data Dictionary
│   ├── 📂 04_KiemThu_Va_BaoCao/ ➔ Báo cáo đáp ứng 5 yêu cầu Thầy Bình, tài liệu Test Cases & Bugs
│   ├── 📂 07_HuongDan_CaiDat/ ➔ Hướng dẫn cài đặt môi trường và triển khai
│   └── 📄 README.md          ➔ Mục lục tra cứu tài liệu nhanh
│
├── 📂 .github/               ➔ Cấu hình CI/CD Workflows kiểm thử tự động
└── 📄 README.md              ➔ Tài liệu tổng quan dự án
```

> 👉 **Tra cứu chi tiết toàn bộ hồ sơ tài liệu:** Xem tại [**`docs/README.md`**](./docs/README.md).

---

## 🚀 3. HƯỚNG DẪN KHỞI CHẠY HỆ THỐNG TRÊN XAMPP

### Bước 1: Khởi động MySQL trong XAMPP
1. Mở **XAMPP Control Panel** trên máy tính.
2. Bấm nút **Start** tại dịch vụ **MySQL** (cổng mặc định `3306`) và **Apache**.
3. Mở trình duyệt truy cập: [http://localhost/phpmyadmin](http://localhost/phpmyadmin).
4. Vào tab **Import** (hoặc tab **SQL**), nạp file kịch bản CSDL duy nhất:  
   👉 [`Source_code/database/medsched_db.sql`](./Source_code/database/medsched_db.sql)  
   *(Tự động tạo Database `medsched_db`, cấu trúc 23 bảng 3NF hoàn chỉnh và nạp sẵn toàn bộ dữ liệu mẫu).*

---

### ⚡ CÁCH CHẠY NHANH BẰNG 1 CÚ ĐÚP CHUỘT (DÀNH CHO WINDOWS)
Mở thư mục `DuAnChinhThuc/Source_code`:
* 👉 [**`start_all.bat`**](./Source_code/start_all.bat): Khởi động trọn gói cả Backend Spring Boot (cổng 8080) và Frontend Next.js (cổng 3000), đồng thời **tự động mở luôn trình duyệt Web** (`http://localhost:3000`) chỉ bằng 1 cú đúp chuột.

---

### Cách chạy thủ công qua Terminal

#### Khởi chạy Backend (Spring Boot 3 & Java 21)
```powershell
cd DuAnChinhThuc/Source_code/backend
./gradlew :app:bootRun
```
Backend chạy tại: **`http://localhost:8080`**  
Tài liệu Swagger UI / OpenAPI: **`http://localhost:8080/swagger-ui.html`**

#### Khởi chạy Frontend (Next.js 15 & React 19)
```powershell
cd DuAnChinhThuc/Source_code/frontend
pnpm dev
```
Giao diện chạy tại: **`http://localhost:3000`**

---

## 📡 4. CÁC PHÂN HỆ GIAO DIỆN & ROUTING (NEXT.JS 15)

| Đường dẫn (Route) | Phân hệ & Chức năng chính | Vai trò truy cập (Role) |
| :--- | :--- | :--- |
| **`/`** | Trang chủ giới thiệu nền tảng đặt khám thông minh MedSched | Public |
| **`/login`** | Đăng nhập JWT, chống tấn công dò mật khẩu (Brute-force lockout), hỗ trợ nút chọn nhanh tài khoản Demo | Public |
| **`/register`** | Đăng ký tài khoản bệnh nhân trực tuyến | Public |
| **`/forgot-password`** | Khôi phục mật khẩu tự động qua Email Magic Link 1-click bảo mật | Public (Patient) |
| **`/profile`** | Hồ sơ người dùng, cập nhật mật khẩu, upload avatar lên Cloudinary CDN, quản lý chuyên môn bác sĩ | Đăng nhập |
| **`/booking-method`** | Lựa chọn phương thức đặt khám: Theo Chuyên khoa & Triệu chứng AI hoặc Theo Bác sĩ | Bệnh nhân / Guest |
| **`/booking`** | Quy trình đặt lịch 4 bước tích hợp AI Triage phân tích triệu chứng gợi ý chuyên khoa, chọn ca khám thực | Bệnh nhân |
| **`/my-appointments`** | Lịch sử khám bệnh, tra cứu trạng thái ca khám, xem chi tiết và tải phiếu hẹn PDF | Bệnh nhân |
| **`/reception`** | Quầy tiếp đón siêu tốc (1 giây) qua quét mã QR phiếu hẹn / thẻ CCCD / tìm kiếm nhanh | Lễ tân / Tiếp đón |
| **`/doctor`** | Không gian làm việc của Bác sĩ: hàng đợi khám, ghi nhận chẩn đoán, kê đơn thuốc điện tử, xuất PDF | Bác sĩ (DOCTOR) |
| **`/admin`** | Dashboard quản trị hệ thống, danh sách tài khoản, khóa / kích hoạt người dùng, phân quyền RBAC | Quản trị (ADMIN) |
| **`/admin/create-user`** | Biểu mẫu cấp tài khoản cho Bác sĩ (chuyên khoa, phòng khám) và Nhân viên lễ tân | Quản trị (ADMIN) |
| **`/statistics`** | Báo cáo trực quan: biểu đồ doanh thu, tỷ lệ đến khám, ca hủy, phân tích công suất phòng khám | Admin / Quản lý |

---

## 🛠️ 5. CÁC ĐẶC TẢ KỸ THUẬT LÕI (TECHNICAL HIGHLIGHTS)

1. **Khóa lạc quan (CAS Concurrency Control):** Áp dụng trường `@Version` trên entity `TimeSlot` nhằm ngăn ngừa triệt để tình trạng đặt trùng lịch (Race Condition) khi nhiều bệnh nhân cùng thao tác tại một khung giờ.
2. **Bảo mật Brute-Force Lockout:** Tích hợp `LoginAttemptService` khóa tài khoản tạm thời 15 phút sau 5 lần nhập sai liên tiếp (trả mã HTTP `423 Locked`).
3. **Phân tích triệu chứng bằng Spring AI:** Kết nối mô hình ngôn ngữ lớn (LLM) để bóc tách từ khóa triệu chứng bệnh nhân nhập vào, đề xuất chuyên khoa tương ứng với độ tin cậy cao.
4. **Tích hợp Cloudinary CDN:** Cho phép tải lên và lưu trữ ảnh đại diện người dùng an toàn với định dạng tối ưu.
5. **Thanh toán VietQR & PayOS:** Sinh mã QR thanh toán viện phí tức thời chuẩn định dạng NAPAS 24/7.
6. **Xuất phiếu khám & Đơn thuốc chuẩn PDF:** Sử dụng thư viện iText 7 kết xuất tài liệu y tế chuyên nghiệp có tích hợp mã vạch/QR Code tra cứu.
7. **Tự động hóa tác vụ ngầm (Cron Jobs):** Lên lịch định kỳ tự động hủy ca khám quá hạn tiếp đón và gửi email nhắc lịch hẹn tự động cho bệnh nhân.
