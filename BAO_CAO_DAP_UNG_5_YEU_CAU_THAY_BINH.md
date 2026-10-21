# 📋 BÁO CÁO CHI TIẾT: MỨC ĐỘ ĐÁP ỨNG 5 TIÊU CHÍ ĐÁNH GIÁ DỰ ÁN MEDSCHED

> **Giảng viên hướng dẫn:** Thầy Trương Thanh Bình  
> **Dự án:** MedSched - Hệ thống Đặt lịch khám & Tiếp đón Y tế Thông minh  
> **Nhánh phát triển chính:** `develop`  
> **Ngày lập báo cáo:** 16/10/2026  

---

## 📊 BẢNG TỔNG HỢP MỨC ĐỘ ĐÁP ỨNG (5/5 TIÊU CHÍ)

| STT | Yêu cầu của Thầy | Trạng thái | Vị trí File Mã Nguồn Cụ Thể | Dòng Code |
|:---:|:---|:---:|:---|:---:|
| **1** | **CICD** | 🟢 **100% Đạt** | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Dòng 18 – 113 |
| **2** | **Deploy Render / Vercel** | 🟢 **100% Đạt** | [`Source_code/backend/Dockerfile`](Source_code/backend/Dockerfile)<br>[`docs/deployment/HUONG_DAN_DEPLOY_MEDSCHED.md`](docs/deployment/HUONG_DAN_DEPLOY_MEDSCHED.md) | Dòng 1 – 38<br>Dòng 9 – 133 |
| **3** | **Làm những luồng không lý tưởng** | 🟢 **100% Đạt** | [`GlobalExceptionHandler.java`](Source_code/backend/app/src/main/java/com/medsched/common/GlobalExceptionHandler.java)<br>[`CancelAppointmentService.java`](Source_code/backend/core/src/main/java/com/medsched/core/usecase/CancelAppointmentService.java)<br>[`AppointmentCleanupJob.java`](Source_code/backend/app/src/main/java/com/medsched/app/adapter/in/scheduler/AppointmentCleanupJob.java) | Dòng 22 – 86<br>Dòng 30 – 63<br>Dòng 39 – 102 |
| **4** | **API statistic** | 🟢 **100% Đạt** | [`StatisticsController.java`](Source_code/backend/app/src/main/java/com/medsched/statistics/StatisticsController.java)<br>[`StatisticsDtos.java`](Source_code/backend/app/src/main/java/com/medsched/statistics/StatisticsDtos.java)<br>[`StatisticsService.java`](Source_code/backend/app/src/main/java/com/medsched/statistics/StatisticsService.java) | Dòng 24 – 52<br>Dòng 8 – 82<br>Dòng 38 – 666 |
| **5** | **MCP Wrapper** | 🟢 **100% Đạt** | [`Source_code/mcp-server/server.js`](Source_code/mcp-server/server.js)<br>[`Source_code/mcp-server/package.json`](Source_code/mcp-server/package.json) | Dòng 1 – 416<br>Dòng 11 – 13 |

---

## 1. TIÊU CHÍ 1: CI/CD PIPELINE (GITHUB ACTIONS)

Hệ thống CI/CD được thiết lập hoàn toàn tự động qua GitHub Actions, kiểm soát chặt chẽ chất lượng code trước khi gộp vào nhánh chính.

* **Đường dẫn file:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
* **Quy tắc kích hoạt (Dòng 3 – 13):** Tự động chạy mỗi khi có lệnh `push` hoặc tạo `pull_request` vào các nhánh `main`, `develop` hoặc nhánh tính năng `feature/**`.

### Chi tiết các công việc (Jobs) trong Pipeline:

#### a) Job 1: `backend-ci` (Dòng 18 – 52)
* **Dòng 30 – 35:** Khởi tạo môi trường **JDK 21** (`temurin`), kích hoạt cache Gradle để tăng tốc độ build.
* **Dòng 40 – 41:** Chạy tự động toàn bộ bài kiểm thử đơn vị & tích hợp JUnit 5:
  ```bash
  run: ./gradlew test --no-daemon
  ```
* **Dòng 43 – 45:** Đóng gói ứng dụng thành file executable Jar độc lập:
  ```bash
  run: ./gradlew :app:bootJar --no-daemon -x test
  ```
* **Dòng 47 – 51:** Lưu trữ bản build `backend-bootjar` lên GitHub Artifacts phục vụ triển khai tự động.

#### b) Job 2: `frontend-ci` (Dòng 56 – 96)
* **Dòng 68 – 76:** Thiết lập **Node.js 20** và trình quản lý gói **pnpm 9**.
* **Dòng 89 – 90:** Kiểm tra kiểu tĩnh TypeScript nghiêm ngặt, chống lỗi runtime:
  ```bash
  run: pnpm exec tsc --noEmit
  ```
* **Dòng 92 – 95:** Biên dịch tối ưu hóa production Next.js 15 với biến môi trường API Backend.

#### c) Job 3: `ci-status` (Dòng 100 – 113)
* Đóng vai trò Quality Gate: Bắt buộc cả 2 job Backend và Frontend đều đạt 100% `SUCCESS` mới cho phép hợp nhất code.

---

## 2. TIÊU CHÍ 2: TRIỂN KHAI ĐÁM MÂY (DEPLOY RENDER & VERCEL)

Dự án áp dụng mô hình kiến trúc phân tán 3 tầng (3-Tier Cloud Architecture) với chi phí 0đ:

```
┌────────────────────────────────┐
│   GIẢNG VIÊN / HỘI ĐỒNG CHẤM   │
└───────────────┬────────────────┘
                ▼ (Truy cập Web)
┌────────────────────────────────┐
│         VERCEL (0đ)            │  🌐 Domain: https://medsched-frontend.vercel.app
│      (Frontend Next.js 15)     │  ⚡ CDN toàn cầu, auto HTTPS
└───────────────┬────────────────┘
                │ Gọi API qua REST (NEXT_PUBLIC_API_URL)
                ▼
┌────────────────────────────────┐
│         RENDER (0đ)            │  🌐 Domain: https://medsched-zu15.onrender.com/api/v1
│     (Backend Spring Boot 3)    │  ⚙️ Container Docker (Java 21)
└───────────────┬────────────────┘
                │ Kết nối JDBC (SSL)
                ▼
┌────────────────────────────────┐
│     AIVEN FOR MYSQL (0đ)       │  🗄️ mysql-medsched-db.aivencloud.com:19144
│       (Cloud Database)         │  💾 1GB RAM / 1GB Disk (Free vĩnh viễn)
└────────────────────────────────┘
```

### Minh chứng mã nguồn:
1. **Dockerfile Multi-Stage tối ưu cho Render:**
   * **Đường dẫn file:** [`Source_code/backend/Dockerfile`](Source_code/backend/Dockerfile)
   * **Dòng 5 – 22 (`Stage 1: builder`)**: Tải dependencies và build `:app:bootJar` bằng JDK 21 Alpine.
   * **Dòng 24 – 38 (`Stage 2: runtime`)**: Chạy ứng dụng trên JRE 21 siêu nhẹ, tạo user bảo mật không đặc quyền `medsched`, giới hạn bộ nhớ `-Xmx384m` chống tràn RAM trên máy chủ Render Free.
2. **Tài liệu hướng dẫn triển khai chi tiết:**
   * **Đường dẫn file:** [`docs/deployment/HUONG_DAN_DEPLOY_MEDSCHED.md`](docs/deployment/HUONG_DAN_DEPLOY_MEDSCHED.md) (Dòng 70 – 133 hướng dẫn từng bước setup Render và Vercel).
   * **Phân công nhiệm vụ đồng bộ:** [`docs/deployment/NHIEM_VU_DEPLOY_RENDER_HIEU.md`](docs/deployment/NHIEM_VU_DEPLOY_RENDER_HIEU.md) (Giao thức cấu hình biến môi trường Gmail OTP và Deploy trên Render).

---

## 3. TIÊU CHÍ 3: XỬ LÝ CÁC LUỒNG KHÔNG LÝ TƯỞNG (UNHAPPY PATHS / EDGE CASES)

Dự án không chỉ xử lý luồng thuận (Happy Path) mà được xây dựng cơ chế phòng thủ đa tầng trước mọi tình huống dữ liệu bất thường và xung đột:

### a) Xử lý ngoại lệ tập trung (Global Exception Handler)
* **Đường dẫn file:** [`Source_code/backend/app/src/main/java/com/medsched/common/GlobalExceptionHandler.java`](Source_code/backend/app/src/main/java/com/medsched/common/GlobalExceptionHandler.java)
  * **Dòng 22 – 35:** Bắt lỗi tài nguyên không tồn tại (`404 Not Found`), xung đột dữ liệu (`409 Conflict`), tham số sai (`400 Bad Request`).
  * **Dòng 53 – 56 (`handleSlotNotAvailable`)**: Bắt lỗi khi 2 bệnh nhân cùng lúc bấm đặt 1 khung giờ khám ➔ Trả về `409 Conflict` để frontend hiển thị thông báo slot vừa bị chiếm.
  * **Dòng 58 – 62 (`handleBadCredentials`)**: Sai email hoặc sai mật khẩu ➔ Trả về cùng một thông báo `"Email hoặc mật khẩu không đúng"` (HTTP 401) nhằm che giấu thông tin, chống tấn công rà quét tài khoản.
  * **Dòng 64 – 72**: Xử lý tài khoản bị vô hiệu hóa (`DisabledException` ➔ 403) và truy cập trái quyền hạn (`AccessDeniedException` ➔ 403).
  * **Dòng 74 – 82 (`handleValidation`)**: Bắt lỗi dữ liệu nhập không hợp lệ (`MethodArgumentNotValidException` ➔ 400 kèm chi tiết từng trường bị lỗi).

### b) Nghiệp vụ Hủy lịch & Thu hồi/Giải phóng Khung giờ khám (Time-slot)
* **Đường dẫn file:** [`Source_code/backend/core/src/main/java/com/medsched/core/usecase/CancelAppointmentService.java`](Source_code/backend/core/src/main/java/com/medsched/core/usecase/CancelAppointmentService.java)
  * **Dòng 33 – 36:** Ca khám đã hủy trước đó ➔ Trả về idempotent, không ghi đè lỗi.
  * **Dòng 40 – 42:** **Chặn hủy ca không hợp lệ:** Chỉ cho phép hủy ca ở trạng thái `PENDING` hoặc `CONFIRMED`. Tuyệt đối chặn không cho hủy ca khám đã được tiếp đón tại quầy (`CHECKED_IN`) hoặc đã khám xong (`COMPLETED`).
  * **Dòng 44 – 51:** **Chặn hủy ca quá hạn:** Không cho phép hủy các ca khám có khung giờ hẹn đã trôi qua trong quá khứ.
  * **Dòng 58 – 60:** **Giải phóng Slot:** Khi hủy thành công ca khám, tự động trả `slot_id` về trạng thái `AVAILABLE` để bệnh nhân khác có thể đặt ngay.

### c) Tự động Quét dọn Ca quá hạn & Bệnh nhân Vắng mặt (No-Show Job)
* **Đường dẫn file:** [`Source_code/backend/app/src/main/java/com/medsched/app/adapter/in/scheduler/AppointmentCleanupJob.java`](Source_code/backend/app/src/main/java/com/medsched/app/adapter/in/scheduler/AppointmentCleanupJob.java)
  * **Dòng 39 – 56:** Cron job chạy ngầm mỗi 5 phút. Quét các ca khám `PENDING` (chờ thanh toán cọc) quá 15 phút mà không chuyển khoản ➔ Tự động Hủy (`CANCELLED`) và giải phóng slot.
  * **Dòng 58 – 75:** Quét các ca `CONFIRMED` nhưng bệnh nhân đến trễ quá 15 phút so với giờ bắt đầu ca khám ➔ Tự động chuyển sang trạng thái Vắng mặt (`MISSED_NO_SHOW`), không hoàn cọc và khóa slot trong quá khứ.

---

## 4. TIÊU CHÍ 4: HỆ THỐNG API THỐNG KÊ (API STATISTIC)

Phân hệ thống kê thời gian thực cung cấp toàn bộ chỉ số vận hành cho Ban Quản trị (Admin) và Bác sĩ.

### a) Danh sách Endpoint Controller
* **Đường dẫn file:** [`Source_code/backend/app/src/main/java/com/medsched/statistics/StatisticsController.java`](Source_code/backend/app/src/main/java/com/medsched/statistics/StatisticsController.java)
  * **Dòng 24 – 35 (`GET /api/v1/statistics/overview`)**: API thống kê tổng quan phân quyền theo vai trò người dùng (Admin / Doctor / Staff), hỗ trợ lọc theo thời gian (`DAY`, `WEEK`, `LAST_30_DAYS`) và lọc theo Bác sĩ (`doctorId`).
  * **Dòng 40 – 52 (`GET /api/v1/admin/statistics/overview`)**: API thống kê chuyên sâu dành riêng cho Admin, được bảo vệ bằng Spring Security `@PreAuthorize("hasRole('ADMIN')")`.

### b) Cấu trúc Dữ liệu Báo cáo (Data Transfer Objects)
* **Đường dẫn file:** [`Source_code/backend/app/src/main/java/com/medsched/statistics/StatisticsDtos.java`](Source_code/backend/app/src/main/java/com/medsched/statistics/StatisticsDtos.java)
  * **Dòng 8 – 13 (`TimeSeriesPoint`)**: Chuỗi dữ liệu theo trục thời gian (nhãn ngày, timestamp, giá trị doanh thu / lượt khám) phục vụ vẽ đồ thị dạng sóng (Sparkline/Area Chart).
  * **Dòng 15 – 24 (`MetricCardData`)**: Thông số 4 thẻ KPI đầu trang (Giá trị, đơn vị, tỷ lệ % tăng/giảm so với kỳ trước, cảnh báo tăng/giảm tích cực).
  * **Dòng 26 – 31 (`DonutSegment`)**: Tỷ lệ phần trăm phân bổ biểu đồ tròn (theo chuyên khoa, theo trạng thái ca khám).
  * **Dòng 33 – 42 (`BreakdownItem`)**: Bảng xếp hạng chi tiết (Top bác sĩ có lượt khám nhiều nhất, doanh thu cao nhất).

### c) Tầng Tính toán Nghiệp vụ
* **Đường dẫn file:** [`Source_code/backend/app/src/main/java/com/medsched/statistics/StatisticsService.java`](Source_code/backend/app/src/main/java/com/medsched/statistics/StatisticsService.java)
  * **Dòng 38 – 666:** Xử lý tổng hợp từ các kho lưu trữ dữ liệu thực: `appointmentRepo`, `invoiceRepo`, `paymentRepo`, `doctorRepo`, `specialtyRepo`.

---

## 5. TIÊU CHÍ 5: MODEL CONTEXT PROTOCOL (MCP) WRAPPER

Dự án đã tích hợp chuẩn giao thức mở **Model Context Protocol (MCP)** của Anthropic, cho phép các Trợ lý AI (như Claude Desktop, Antigravity, ChatGPT, Gemini) có thể giao tiếp trực tiếp và ra lệnh cho hệ thống MedSched thông qua luồng Stdio Transport.

### a) Thư viện & Cấu hình Gói
* **Đường dẫn thư mục:** [`Source_code/mcp-server`](Source_code/mcp-server)
* **File package:** [`Source_code/mcp-server/package.json`](Source_code/mcp-server/package.json)
  * **Dòng 11 – 13**: Sử dụng thư viện chính thức `@modelcontextprotocol/sdk: ^1.6.0`.

### b) Máy chủ MCP Server
* **Đường dẫn file:** [`Source_code/mcp-server/server.js`](Source_code/mcp-server/server.js)
* **Dòng 24 – 34:** Khởi tạo MCP Server `medsched-mcp-server` với capability `tools`.

#### Danh sách 5 MCP Tools đã triển khai cho AI Agent:
1. **`get_doctors` (Dòng 42 – 54)**: Tra cứu danh sách bác sĩ trong phòng khám MedSched (học vị, chuyên khoa, phòng khám, giá khám).
2. **`get_appointment_by_code` (Dòng 56 – 68)**: Tra cứu trạng thái vé hẹn của bệnh nhân theo mã đặt lịch (ví dụ: `MED918869`).
3. **`reception_checkin` (Dòng 70 – 82)**: Kích hoạt thủ tục Tiếp đón / Check-in 1 chạm tại quầy lễ tân thông qua câu lệnh thoại của AI.
4. **`get_daily_statistics` (Dòng 84 – 96)**: Cung cấp báo cáo số liệu phòng khám thời gian thực cho AI Agent tổng hợp và tư vấn.
5. **`simulate_payment_received` (Dòng 98 – 114)**: Kích hoạt mô phỏng Webhook ngân hàng VietQR/MoMo báo tiền cọc đã về tài khoản, phục vụ nghiệm thu tự động.

* **Dòng 122 – 388 (`CallToolRequestSchema`)**: Điều phối yêu cầu gọi HTTP trực tiếp sang Backend MedSched (`/api/v1`), có cơ chế fallback thông minh khi cần chạy độc lập.
* **Dòng 405 – 410 (`run()`)**: Kết nối Stdio Server Transport tiêu chuẩn.
* **File mẫu tích hợp AI:** [`Source_code/mcp-server/mcp_config.example.json`](Source_code/mcp-server/mcp_config.example.json) dùng để nhúng trực tiếp vào cấu hình Claude Desktop hoặc Antigravity IDE.

---

## 🏆 KẾT LUẬN NGHIỆM THU

Cả **5/5 tiêu chí** do Thầy Trương Thanh Bình yêu cầu:
1. ✅ **CICD**
2. ✅ **Deploy Render/Vercel**
3. ✅ **Làm những luồng không lý tưởng**
4. ✅ **API statistic**
5. ✅ **MCP Wrapper**

Đều đã được hiện thực hóa đầy đủ, chạy ổn định, có mã nguồn rõ ràng và đạt tiêu chuẩn đồ án chất lượng cao.
