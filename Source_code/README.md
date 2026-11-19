# 🏥 MEDSCHED PRO — CLEAN SOURCE CODE
## HỆ THỐNG ĐẶT LỊCH KHÁM BỆNH & ĐIỀU PHỐI TIẾP ĐÓN THÔNG MINH
> **Học phần:** Chuyên đề Phát triển Phần mềm (Java Web Fullstack)  
> **Lớp:** CD25CT_CLC — **Nhóm:** 02  
> **Giảng viên hướng dẫn:** Thầy Trương Thanh Bình (Khoa CNTT - Điện tử, ITC)  
> **Video thuyết trình nghiệm thu:** [https://www.youtube.com/watch?v=cdJe2Y0I3G0](https://www.youtube.com/watch?v=cdJe2Y0I3G0)  
> **Web triển khai thực tế (Live Cloud):** [https://medsched-lyart.vercel.app](https://medsched-lyart.vercel.app)  
> **Swagger API Backend (Render Cloud):** [https://medsched-zui5.onrender.com/swagger-ui/index.html](https://medsched-zui5.onrender.com/swagger-ui/index.html)  

---

## 👥 Danh Sách Thành Viên Thực Hiện (Nhóm 02)

| STT | MSSV | Họ và tên | Vai trò chính trong dự án |
| :---: | :---: | :--- | :--- |
| 1 | **506250495** | **Châu Tuấn Kiệt** | Trưởng nhóm (Leader) / Kiến trúc sư phần mềm (Architect) & Fullstack |
| 2 | **501250367** | **Nguyễn Văn Hiếu** | Backend Developer / Bảo mật Spring Security JWT & Triển khai Cloud |
| 3 | **501250471** | **Lê Thành Tài** | Database Developer / Thiết kế & Chuẩn hóa CSDL 23 bảng chuẩn 3NF |
| 4 | **501250114** | **Huỳnh Thị Kim Trang** | Frontend Developer / Xây dựng giao diện Next.js 15 & Tối ưu UX |
| 5 | **501250145** | **Nguyễn Thị Yến Nhi** | Business Analyst (BA) & Tester / Đặc tả tài liệu SRS & Kiểm thử UAT |
| 6 | **501250392** | **Trần Nhật Tân** | AI Integration & MCP Engineer / Trợ lý AI Triage & Model Context Protocol |

---

## 📂 Cấu Trúc Thư Mục Mã Nguồn

```text
Source_code/
├── backend/               # Mã nguồn Backend Java 21 LTS & Spring Boot 3.4.3
│   ├── core/              # Domain Layer & Use Cases (Độc lập framework, chuẩn Hexagonal)
│   │   ├── domain/model/  # Domain Entities (Appointment, Slot, Doctor, Patient...)
│   │   ├── port/in/       # Inbound Ports (Use Cases interfaces)
│   │   ├── port/out/      # Outbound Ports (Repository & Gateway interfaces)
│   │   └── usecase/       # Nghiệp vụ lõi (Book, Cancel, Restore, Schedule, Triage...)
│   ├── app/               # Application & Infrastructure Adapters Layer
│   │   ├── adapter/in/web # REST Controllers (Web Adapters, Swagger OpenAPI)
│   │   ├── adapter/out/   # JPA Repositories (MySQL Aiven/Local), AI Client, Cloudinary
│   │   ├── config/        # Spring Security JWT, CORS, Dependency Injection wiring
│   │   └── common/        # Global Exception Handler, RFC 7807 Problem Details
│   └── Dockerfile         # Docker Multi-stage build tối ưu ram (<384MB cho Render)
│
├── frontend/              # Mã nguồn Frontend Next.js 15 (React 19, TypeScript, Tailwind)
│   ├── src/app/           # App Router 27 routes (booking, reception, doctor, admin...)
│   ├── src/modules/       # Modularity components (appointment, doctor, profile, auth...)
│   └── src/shared/        # Shared UI components, API client Axios, hooks, utils
│
├── mcp-server/            # Model Context Protocol Server (Node.js) cho AI Agent
│   ├── tools/             # MCP Tools (get_available_slots, book_appointment, triage...)
│   └── server.js          # Khởi chạy máy chủ MCP tích hợp Antigravity / Claude
│
├── database/              # Cơ sở dữ liệu quan hệ MySQL 8.0 (23 bảng chuẩn hóa 3NF)
│   └── medsched_db.sql    # Kịch bản DDL + DML nạp toàn bộ cấu trúc & dữ liệu mẫu
│
├── api-spec/              # Đặc tả API chuẩn OpenAPI 3.0 / Swagger JSON
├── monitoring/            # Kịch bản kiểm thử tải đồng thời JMeter (.jmx)
├── docker-compose.yml     # Khởi chạy toàn bộ hệ thống cục bộ chỉ bằng 1 câu lệnh Docker
├── start_all.bat          # Script 1-click khởi chạy song song Backend + Frontend trên Windows
└── README.md              # Tài liệu hướng dẫn này
```

---

## 🛠️ Công Nghệ & Tiêu Chuẩn Kỹ Thuật (Đáp ứng 5 Tiêu Chí Thầy Bình)

1. **Kiến trúc Hexagonal (Clean Architecture / Ports & Adapters)**:
   - Module `core`: Hoàn toàn không phụ thuộc Spring framework, bảo vệ 100% nghiệp vụ phòng khám (Domain logic độc lập).
   - Module `app`: Chứa Adapters bên ngoài (Web REST API, JPA Persistence, Spring Security JWT, Spring AI Client).
2. **Tự động hóa CI/CD (GitHub Actions)**:
   - Pipeline tự động chạy kiểm thử đơn vị JUnit 5 (`core` & `app`) và build TypeScript tĩnh Next.js 15 trước khi merge code.
3. **Triển khai Đám mây Chi phí 0đ**:
   - Backend chạy trên **Render Cloud** với Docker container tối ưu tài nguyên (`-Xmx384m`).
   - Frontend chạy trên **Vercel Edge Network** với CDN toàn cầu và HTTPS tự động.
   - Database MySQL chạy trên **Aiven Cloud** với kết nối bảo mật SSL.
4. **Phòng thủ ngoại lệ toàn diện (Unhappy Paths & Anti-spam)**:
   - Cơ chế khóa lạc quan / CAS kiểm soát tranh chấp khung giờ, chống Double Booking tuyệt đối.
   - Giới hạn quota: Tối đa 1 ca đang chờ khám/ngày cho bản thân và 2 ca cho người thân. Sau khi khám xong (`COMPLETED`), cho phép đặt ca tiếp theo nhưng chặn đặt lại cùng bác sĩ trong 1 ngày.
   - Hỗ trợ tính năng phát hiện và khôi phục phiếu hẹn đã hủy (`Restore cancelled appointment`).
5. **Giao thức MCP Server & AI Clinical Triage**:
   - Trợ lý AI hỗ trợ gợi ý chuyên khoa 24/7 theo mô tả triệu chứng bệnh nhân.
   - Máy chủ Model Context Protocol (MCP) chuẩn mở cho phép AI Agent đọc lịch và đặt khám tự động.

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy Hệ Thống Cục Bộ (Local)

### Yêu cầu tiên quyết (Prerequisites)
- **Java Development Kit (JDK)**: Phiên bản 21 LTS trở lên.
- **Node.js**: Phiên bản 20 LTS trở lên (khuyên dùng kèm package manager `pnpm` hoặc `npm`).
- **MySQL / MariaDB**: Phiên bản 8.0+ (hoặc phần mềm XAMPP Control Panel).

---

### Cách 1: Khởi chạy nhanh 1-Click bằng Script Windows
1. Đảm bảo dịch vụ MySQL trên máy đã được bật (cổng `3306`). Nạp file `database/medsched_db.sql`.
2. Nhấp đúp chuột vào file:
   ```text
   start_all.bat
   ```
   *(Script sẽ tự động khởi động Backend tại cổng 8080, khởi động Frontend tại cổng 3000 và tự động mở trình duyệt web)*.

---

### Cách 2: Khởi chạy nhanh bằng Docker Compose
Nếu máy tính đã cài đặt **Docker Desktop**:
```bash
docker-compose up -d
```
Hệ thống sẽ tự động kéo image, khởi tạo cơ sở dữ liệu MySQL và khởi chạy toàn bộ dịch vụ.

---

### Cách 3: Khởi chạy thủ công từng phân hệ

#### 1. Khởi tạo Cơ sở dữ liệu:
- Mở **phpMyAdmin** (hoặc MySQL Workbench / DBeaver).
- Tạo CSDL tên: `medsched_db`.
- Import file: `database/medsched_db.sql`.

#### 2. Khởi chạy Backend (Java Spring Boot 3):
```bash
cd backend
./gradlew :app:bootRun
```
*(Trên Windows có thể chạy: `gradlew.bat :app:bootRun`)*.  
- Backend REST API chạy tại: `http://localhost:8080`  
- Tài liệu Swagger UI: `http://localhost:8080/swagger-ui/index.html`

#### 3. Khởi chạy Frontend (Next.js 15):
```bash
cd frontend
pnpm install   # hoặc: npm install
pnpm dev       # hoặc: npm run dev
```
- Truy cập giao diện ứng dụng tại: `http://localhost:3000`

#### 4. Khởi chạy MCP Server (Tùy chọn cho AI Agent):
```bash
cd mcp-server
npm install
node server.js
```

---

## 🔑 Tài Khoản Demo Trải Nghiệm 4 Phân Quyền (Roles)

Hệ thống đã nạp sẵn các tài khoản demo chuẩn với mật khẩu đồng bộ để Thầy và người dùng dễ dàng kiểm thử nghiệm thu:

| Vai trò (Role) | Tên đăng nhập (Username) | Mật khẩu (Password) | Phân hệ truy cập chính |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin` | `Admin@123` | `/admin` (Quản lý hệ thống, cấu hình ca trực, thống kê) |
| **Tiếp đón (Receptionist)** | `reception` | `Reception@123` | `/reception` (Tiếp đón bệnh nhân, gọi số, check-in QR, thu phí) |
| **Bác sĩ (Doctor)** | `doctor` | `Doctor@123` | `/doctor` (Hàng đợi khám, nhập chẩn đoán ICD-10, kê đơn thuốc) |
| **Bệnh nhân (Patient)** | `patient` | `Patient@123` | `/booking`, `/my-appointments` (Đặt lịch AI, xem E-Ticket) |

---

## 🌐 Đường Dẫn Trực Tuyến Đã Triển Khai (Live Production)

- **Ứng dụng Web Bệnh nhân & Nhân viên Y tế**: [https://medsched-lyart.vercel.app](https://medsched-lyart.vercel.app)
- **Tài liệu OpenAPI / Swagger UI Backend**: [https://medsched-zui5.onrender.com/swagger-ui/index.html](https://medsched-zui5.onrender.com/swagger-ui/index.html)
- **Video Final Thuyết trình Nghiệm thu Đồ án**: [https://www.youtube.com/watch?v=cdJe2Y0I3G0](https://www.youtube.com/watch?v=cdJe2Y0I3G0)
