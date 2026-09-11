# 🏥 DỰ ÁN CAPSTONE: HỆ THỐNG Y TẾ THÔNG MINH MEDSCHED
## Developing Smart Web Apps with Spring Boot & AI

> **Đơn vị đào tạo:** Khóa học Java Spring 2 – Spring Boot & AI  
> **Kiến trúc:** Clean / Hexagonal Architecture (Ports & Adapters)  
> **Backend:** Spring Boot 3.4.3 (Java 21, Multi-module Gradle: `core` & `app`, Spring Security JWT, Spring AI)  
> **Frontend:** Next.js 15+ (React 19, TypeScript, Lucide Icons)  
> **Cơ sở dữ liệu:** **XAMPP (MySQL / MariaDB – Cổng mặc định 3306) + phpMyAdmin**  

---

## 👥 1. BẢNG PHÂN CÔNG NHIỆM VỤ NHÓM (6 THÀNH VIÊN)

| STT | Họ và tên | Vai trò | Nhiệm vụ chính phụ trách | Thư mục làm việc trọng tâm |
| :---: | :--- | :---: | :--- | :--- |
| **1** | **Châu Tuấn Kiệt** | **Leader** | Quản lý tiến độ, thiết kế kiến trúc toàn hệ thống, điều phối tích hợp và thuyết trình. | `backend/core/port`, `README.md` |
| **2** | **Nguyễn Văn Hiếu** | **Backend Dev** | Phát triển Use Cases lõi, API Time-slots, khóa lạc quan Concurrency, Spring Security JWT. | `backend/core/usecase`, `backend/app/adapter/in/web` |
| **3** | **Lê Thành Tài** | **Database / Persistence** | Tối ưu hóa 16 bảng chuẩn 3NF, tính toàn vẹn CSDL XAMPP, viết Flyway migrations. | `backend/app/adapter/out/persistence`, `database/` |
| **4** | **Nguyễn Thị Yến Nhi** | **Business Analyst (BA)** | Đặc tả 26 tính năng F01–F26, ma trận phân quyền RBAC, kiểm thử chấp nhận người dùng (UAT). | `docs/`, kịch bản nghiệm thu |
| **5** | **Tân Cùng Bàn** *(Tân)* | **AI Engineer** | Tích hợp Spring AI ChatClient, Prompt engineering cho Triage phân loại khoa, tóm tắt bệnh án 2 dòng. | `backend/app/adapter/out/ai` |
| **6** | **Trang Huynh** *(Trang)* | **Frontend Dev** | Xây dựng UI/UX Next.js 15, kết nối REST API, quản lý trạng thái đặt lịch và phân quyền giao diện. | `frontend/` |

---

## 📂 2. CẤU TRÚC THƯ MỤC DỰ ÁN

```
DuAnChinhThuc/
│
├── 📂 Ly_Thuyet/                                ➔ [PHÂN HỆ 1: LÝ THUYẾT & TÀI LIỆU ĐỀ TÀI]
│   ├── 📂 1. Slide/                            ➔ Slide và ghi chú bài giảng chi tiết 10 tuần
│   ├── 📊 Chuong_Trinh_Thuc_Tap_Spring_Boot_AI.xlsx ➔ Lộ trình đào tạo 10 tuần
│   └── 📂 De_TaiThamKhao/ThamKhao/             ➔ Hồ sơ đặc tả 4 phân hệ (Features, Actors, Luồng, CSDL 17 bảng)
│
└── 📂 Source_code/                              ➔ [PHÂN HỆ 2: MÃ NGUỒN THỰC THI PHẦN MỀM]
    ├── 📂 backend/                              ➔ Multi-module Gradle Spring Boot 3 & Java 21
    │   ├── 📂 core/                            ➔ Domain Model, Ports & Use Cases thuần Java
    │   └── 📂 app/                             ➔ Spring Boot Web, Task 1 (Auth, Account, Admin), JPA 17 bảng
    ├── 📂 frontend/                             ➔ Giao diện Next.js 15+ (React 19, TypeScript)
    ├── 📂 database/                             ➔ Chứa 1 file medsched_db.sql duy nhất (17 bảng + seed data)
    ├── 📄 TASK1_KHUNG_SUON.md                   ➔ Hướng dẫn Task 1 của Tài (68 test cases pass 100%)
    └── ⚡ start_all.bat                         ➔ 1-Click tự động chạy song song cả Backend và Frontend
```

---

## 🚀 3. HƯỚNG DẪN KHỞI CHẠY HỆ THỐNG TRÊN XAMPP

### Bước 1: Khởi động MySQL trong XAMPP
1. Mở **XAMPP Control Panel** trên máy tính.
2. Bấm nút **Start** tại dịch vụ **MySQL** (cổng mặc định `3306`) và **Apache**.
3. Mở trình duyệt truy cập: [http://localhost/phpmyadmin](http://localhost/phpmyadmin).
4. Vào tab **Import** (hoặc tab **SQL**), nạp file kịch bản CSDL duy nhất:
   👉 [`Source_code/database/medsched_db.sql`](./Source_code/database/medsched_db.sql) (tự tạo DB `medsched_db`, 17 bảng và nạp sẵn toàn bộ dữ liệu mẫu).

---

### ⚡ CÁCH CHẠY NHANH BẰNG 1 CÚ ĐÚP CHUỘT (DÀNH CHO WINDOWS)
Mở thư mục `DuAnChinhThuc/Source_code`:
* 👉 [**`start_all.bat`**](./Source_code/start_all.bat): Khởi động trọn gói cả Backend Spring Boot (cổng 8080) và Frontend Next.js (cổng 3000), đồng thời **tự động mở luôn trình duyệt Web** (`http://localhost:3000`) chỉ bằng 1 cú đúp chuột.

---

### Cách chạy thủ công qua Terminal

#### Khởi chạy Backend (Spring Boot 3)
```powershell
cd DuAnChinhThuc/Source_code/backend
./gradlew :app:bootRun
```
Backend chạy tại: **`http://localhost:8080`**

#### Khởi chạy Frontend (Next.js 15)
```powershell
cd DuAnChinhThuc/Source_code/frontend
npm run dev
```
Giao diện chạy tại: **`http://localhost:3000`**

---

## 📡 4. DANH SÁCH REST API ĐÃ SẴN SÀNG

| Phương thức | Endpoint | Chức năng | Phụ trách chính |
| :---: | :--- | :--- | :---: |
| **POST** | `/api/appointments` | Đặt lịch khám mới (kiểm tra slot, khóa lạc quan, tóm tắt AI) | Hiếu & Kiệt |
| **GET** | `/api/appointments/{id}` | Lấy chi tiết lịch hẹn theo ID | Hiếu |
| **GET** | `/api/appointments/booking-code/{code}` | Tra cứu lịch hẹn bằng mã đặt chỗ (phục vụ quét QR) | Hiếu |
| **POST** | `/api/reception/checkin/qr` | Tiếp đón bệnh nhân trong 1 giây qua mã QR vé khám | Hiếu & Trang |
| **POST** | `/api/reception/checkin/cccd` | Tiếp đón siêu tốc qua thẻ CCCD gắn chip Bộ Công An | Hiếu & Trang |
| **POST** | `/api/ai/triage` | Spring AI phân loại chuyên khoa và tóm tắt triệu chứng | Tân |
