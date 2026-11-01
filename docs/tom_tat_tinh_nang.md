# TÓM TẮT TÍNH NĂNG DỰ ÁN MEDSCHED

> **Dự án:** MedSched — Hệ thống đặt lịch khám & vận hành phòng khám đa cơ sở
> **Nhánh tham chiếu:** `develop` (commit `cedf712`, phiên bản `1.3.1`)
> **Người lập:** Nhóm phát triển MedSched
> **Mục đích tài liệu:** Tổng hợp kiểm kê tính năng thực tế từ mã nguồn, phục vụ họp nhóm, báo cáo tiến độ và bảo vệ đồ án.

---

## 0. KẾT LUẬN NHANH (dành cho Trưởng nhóm)

| Hạng mục | Số lượng |
| :--- | :---: |
| Phân hệ chức năng lớn | **9** |
| Tính năng nghiệp vụ theo Product Backlog (F01–F26) | **26** |
| Hạng mục chức năng chi tiết (kiểm kê từ code) | **90** |
| REST Controller | **11** |
| Route mapping backend | **~82** |
| Màn hình Frontend | **22** |
| Bảng cơ sở dữ liệu | **21** |
| File Java main / test | **138 / 27** |
| Số lượng unit + integration test | **160** |
| Cron Job tự động | **2** (+ 2 job đối soát định kỳ) |
| Cổng thanh toán tích hợp | **3** (SePay, PayOS/VietQR, VNPay) |
| MCP Tools cho AI | **9** |

**Câu chốt khi báo cáo:**
> *“Dự án có 9 phân hệ, 26 tính năng nghiệp vụ theo backlog, được triển khai thành 90 hạng mục chức năng chi tiết với 82 API mapping, 22 màn hình, 21 bảng CSDL và 160 test.”*

---

## 1. TỔNG QUAN DỰ ÁN

**MedSched** là nền tảng y tế số phục vụ 4 nhóm người dùng (Bệnh nhân, Lễ tân, Bác sĩ, Admin) theo mô hình phòng khám đa cơ sở.

### 1.1. Luồng nghiệp vụ cốt lõi

```text
Bệnh nhân đặt lịch online
      → nhận mã vé MEDxxxxxx + QR
      → thanh toán giữ chỗ (VietQR / PayOS / VNPay)
      → Lễ tân quét QR / CCCD check-in
      → Ca khám tự vào hàng đợi Bác sĩ
      → Bác sĩ gọi số, khám, ghi bệnh án EHR, kê đơn
      → Hoàn tất ca khám
      → Lễ tân thu viện phí, in hóa đơn
      → Admin giám sát KPI & doanh thu
```

### 1.2. Điểm nhấn kỹ thuật

- **Hexagonal Architecture** (Ports & Adapters), tách module `core` thuần Java khỏi `app` (Spring/JPA).
- **Atomic CAS** trên CSDL chống double-booking tuyệt đối.
- **Giữ chỗ 15 phút** + Cron Job tự hủy và trả slot.
- **JWT 1 phiên duy nhất** qua bảng `revoked_tokens`.
- **AI Triage + MCP Tools + RAG nội bộ** hỗ trợ 4 vai trò.
- **3 cổng thanh toán** với webhook xác thực chữ ký.
- **CI/CD + Docker + Prometheus/Grafana + MCP Server**.

---

## 2. CÔNG NGHỆ THỰC TẾ

| Lớp | Công nghệ |
| :--- | :--- |
| Backend | **Java 21**, Spring Boot **3.4.3**, Gradle multi-module (`core` + `app`), Spring Security 6, Spring Data JPA, Validation, Lombok, Actuator |
| AI | Spring AI (BOM 1.0.0-M6), OpenAI/OpenRouter, **Gemini 2.5**, RAG nội bộ, MCP |
| Xác thực | JWT HMAC-SHA256 (jjwt 0.12.6), BCrypt, `revoked_tokens` |
| Rate limit | Bucket4j |
| Cơ sở dữ liệu | MySQL/MariaDB — XAMPP local, **Aiven Cloud** production, `ddl-auto: validate` |
| Frontend | **Next.js 15.1**, **React 19**, TypeScript 5.7, Tailwind v4, Lucide, `qrcode`, `jsqr` |
| Hạ tầng | Render (Docker), Vercel, Aiven MySQL, UptimeRobot, Prometheus + Grafana |
| CI/CD | GitHub Actions: backend test + bootJar, frontend `tsc --noEmit` + build, quality gate |

> **Lưu ý:** Tài liệu SRS cũ ghi Java 17 / Spring 3.3 / Next 14 — **không còn đúng**. Bảng trên là số liệu thực tế từ `build.gradle` và `package.json`.

---

## 3. KIẾN TRÚC MÃ NGUỒN

```text
Source_code/
├── backend/
│   ├── core/                     # Domain thuần Java, không phụ thuộc framework
│   │   └── com/medsched/core/
│   │       ├── domain/model      # Appointment, TimeSlot, Doctor, AccountUser
│   │       ├── domain/exception  # DomainException, SlotNotAvailable, ResourceNotFound
│   │       ├── port/in           # 5 UseCase (Book, Cancel, Checkin, ChangePassword, UpdateProfile)
│   │       ├── port/out          # 6 Port (Account, Appointment, TimeSlot, AI Triage, PasswordEncoder…)
│   │       └── usecase           # 5 Service nghiệp vụ
│   └── app/                      # Adapters + Framework
│       └── com/medsched/
│           ├── adapter/in/web        # 11 REST Controller
│           ├── adapter/in/scheduler  # 2 Cron Job
│           ├── adapter/in/ai         # MedSchedAiTools (9 MCP tools)
│           ├── adapter/out/persistence / ai / security
│           ├── config                # AiConfig, CorsConfig, UseCaseConfig
│           └── feature packages      # admin, doctor, reception, billing, statistics, mail, common
├── frontend/
│   └── src/
│       ├── app/          # 22 route (App Router)
│       ├── modules/      # module-by-feature: admin, appointment, auth, doctor, home, profile, reception, statistics
│       └── shared/       # components, hooks, lib, types dùng chung
├── database/medsched_db.sql      # Schema + seed data 21 bảng
├── mcp-server/                   # MCP Wrapper Server (Node.js)
├── api-spec/                     # openapi.yaml + Postman collection
├── monitoring/                   # docker-compose Prometheus + Grafana
└── start_all.bat                 # Khởi chạy 1 click (BE 8080 + FE 3000)
```

---

## 4. DANH MỤC 90 TÍNH NĂNG CHI TIẾT

### A. Xác thực & Tài khoản — 11 tính năng

| Mã | Tính năng | Ghi chú triển khai |
| :---: | :--- | :--- |
| A1 | Đăng ký tài khoản bệnh nhân | Tự sinh `patient_profiles` với `relationship = SELF` |
| A2 | Đăng nhập 4 vai trò | Trả access token + refresh token + danh sách quyền |
| A3 | Refresh token | Không cho dùng access token để refresh |
| A4 | OTP xác thực đăng ký | 4–6 số, hết hạn 120s, gửi Brevo HTTPS (fallback Gmail SMTP) |
| A5 | Gửi lại OTP | Cooldown 60s |
| A6 | Quên / đặt lại mật khẩu | `/forgot-password`, `/reset-password` |
| A7 | Đổi mật khẩu | Bắt nhập mật khẩu cũ, chặn trùng mật khẩu cũ |
| A8 | Xem / sửa hồ sơ cá nhân | `GET/PUT /api/v1/me` |
| A9 | Hồ sơ y tế bệnh nhân | CCCD, BHYT, ngày sinh, giới tính, tiền sử bệnh |
| A10 | Hồ sơ chuyên môn bác sĩ | Học vị, kinh nghiệm, tiểu sử, avatar (không cho tự sửa giá/phòng) |
| A11 | Giới hạn 1 phiên + khóa 1 tab | `revoked_tokens` + `SingleTabLockOverlay`, `ConcurrentSessionModal` |

### B. Quản trị hệ thống (Admin) — 12 tính năng

| Mã | Tính năng |
| :---: | :--- |
| B1 | Danh sách người dùng: lọc theo vai trò/chi nhánh, tìm kiếm, phân trang |
| B2 | Xem chi tiết tài khoản kèm các quyền đã cấp |
| B3 | Tạo tài khoản Lễ tân và gán quyền tại chi nhánh |
| B4 | Tạo tài khoản Bác sĩ kèm hồ sơ chuyên môn, phòng khám, giá khám |
| B5 | Khóa / mở khóa tài khoản (chặn đăng nhập ngay lập tức) |
| B6 | Admin đặt lại mật khẩu người dùng |
| B7 | Gán / thu hồi quyền theo cơ sở y tế (`user_medical_center_roles`) |
| B8 | Admin cập nhật hồ sơ bác sĩ |
| B9 | CRUD cơ sở y tế + kích hoạt lại (xóa mềm giữ lịch sử) |
| B10 | CRUD chuyên khoa (chặn xóa khi còn bác sĩ — HTTP 409) |
| B11 | CRUD dịch vụ & bảng giá (chặn giá âm, chặn trùng mã) |
| B12 | Danh mục bác sĩ công khai cho trang đặt khám |

### C. Lịch trực bác sĩ — 10 tính năng

| Mã | Tính năng |
| :---: | :--- |
| C1 | Xem lịch trực theo tuần/ngày |
| C2 | Tạo ca trực, **tự sinh các slot 30 phút** |
| C3 | Validate chặn giờ quá khứ, tự làm tròn mốc giờ hợp lệ |
| C4 | Chống trùng buồng khám giữa các bác sĩ cùng khung giờ |
| C5 | Đổi buồng khám (khóa trong ngày, chỉ đổi trước ngày trực) |
| C6 | Khóa / mở khóa slot nghỉ (toggle lock) |
| C7 | Hủy ca trực khẩn cấp + danh sách bệnh nhân bị ảnh hưởng |
| C8 | Xóa ca trực |
| C9 | **Cron 17h** tự xếp lịch ngày mai + trigger thủ công |
| C10 | Bảng công suất / tình trạng buồng khám (`room-occupancy`) |

### D. Đặt lịch khám — 12 tính năng

| Mã | Tính năng | Ghi chú |
| :---: | :--- | :--- |
| D1 | Tìm bác sĩ theo chuyên khoa / chi nhánh | |
| D2 | Xem khung giờ trống của bác sĩ | Chỉ slot `AVAILABLE`, chưa qua giờ |
| D3 | Đặt lịch + **Atomic CAS** | Request thua nhận **HTTP 409** |
| D4 | Sinh mã booking `MEDxxxxxx` + QR check-in | |
| D5 | **Giữ chỗ 15 phút** + Cron dọn dẹp mỗi 5 phút | Tự hủy `PENDING`, trả slot `AVAILABLE` |
| D6 | Xem chi tiết lịch hẹn | |
| D7 | Tra cứu lịch hẹn theo booking code | |
| D8 | “Lịch hẹn của tôi” | |
| D9 | Đổi lịch (reschedule) | Áp dụng lại CAS cho slot mới |
| D10 | Hủy lịch + trả slot | |
| D11 | Xem đơn thuốc / kết quả khám sau khi hoàn tất | |
| D12 | Chọn phương thức đặt lịch (trực tiếp / tư vấn AI) | |

### E. Tiếp đón tại quầy (Lễ tân) — 10 tính năng

| Mã | Tính năng |
| :---: | :--- |
| E1 | Live feed danh sách lịch hẹn hôm nay, tự cập nhật trạng thái |
| E2 | **Check-in bằng mã QR** vé hẹn |
| E3 | **Check-in bằng CCCD** (có hẹn trước + tự tạo ca vãng lai) |
| E4 | Tiếp nhận khách vãng lai chỉ với Tên + SĐT |
| E5 | **Cấp tài khoản tại quầy + in phiếu bàn giao** (username/mật khẩu tự sinh) |
| E6 | **Đặt lịch nhanh qua điện thoại** trên bảng giờ trực |
| E7 | Bảng ma trận giờ trực toàn viện |
| E8 | Lịch sử tiếp đón, tra cứu |
| E9 | Bảng kê viện phí (tiền khám + tiền thuốc) |
| E10 | Thu tiền hóa đơn, xuất biên lai |

### F. Buồng khám & Bệnh án điện tử — 13 tính năng

| Mã | Tính năng |
| :---: | :--- |
| F1 | Hàng đợi bệnh nhân realtime (polling) |
| F2 | Gọi số bệnh nhân (`call`) |
| F3 | Tiếp nhận vào buồng khám (`admit`) |
| F4 | Chỉ định cận lâm sàng (`lab`) |
| F5 | Tạm hoãn ca khám / gọi lại (`defer`) |
| F6 | Đánh dấu vắng mặt (`miss` → `MISSED_NO_SHOW`) |
| F7 | Đồng hồ ca khám 30 phút + gia hạn 10/15 phút |
| F8 | **Quy tắc khám 1:1** — chưa xong ca hiện tại thì không gọi ca mới |
| F9 | Bệnh án điện tử EHR + chẩn đoán ICD-10 + lời dặn |
| F10 | Kê đơn thuốc điện tử nhiều dòng, tự tính thành tiền |
| F11 | **Đơn thuốc mẫu (presets) + tự động lưu nháp** chống mất dữ liệu |
| F12 | Hoàn tất ca khám + in đơn thuốc |
| F13 | Lịch sử khám bệnh & đơn thuốc của bác sĩ |

### G. Thanh toán — 8 tính năng

| Mã | Tính năng |
| :---: | :--- |
| G1 | Tạo link thanh toán **PayOS / VietQR** |
| G2 | Polling trạng thái thanh toán (2.8s/lần) |
| G3 | **Webhook SePay** nhận biến động số dư |
| G4 | **Webhook PayOS** + xác thực chữ ký HMAC-SHA256 |
| G5 | Xác nhận thanh toán thủ công (chặn khi tiền chưa về) |
| G6 | **VNPay** create-url + IPN |
| G7 | Trang mock VNPay + mô phỏng webhook (môi trường test) |
| G8 | Xử lý tiền về muộn (`PENDING_REVIEW`, hoàn tiền) |

### H. Trí tuệ nhân tạo (AI) — 8 tính năng

| Mã | Tính năng |
| :---: | :--- |
| H1 | **AI Triage** phân tích triệu chứng → gợi ý chuyên khoa + tóm tắt lâm sàng |
| H2 | Gợi ý bác sĩ + khung giờ thật theo chuyên khoa |
| H3 | Chat trợ lý y tế **nhận biết 4 vai trò** (Patient/Doctor/Staff/Admin) |
| H4 | **RAG nội bộ** trên tri thức phòng khám (`patient-knowledge-base.md`) |
| H5 | **9 MCP Tools**: triage, tra bác sĩ, slot trống, verify booking, check-in, tìm bệnh nhân, tóm tắt bệnh án, tư vấn thuốc, thống kê admin |
| H6 | Rate limit / guard AI (20 req/phút, chống trùng, giới hạn ký tự) |
| H7 | Fallback rule-based khi thiếu API key |
| H8 | Universal AI Assistant Modal dùng chung toàn hệ thống |

### I. Thống kê & Giám sát — 6 tính năng

| Mã | Tính năng |
| :---: | :--- |
| I1 | Dashboard KPI Admin: doanh thu, tỷ lệ hoàn thành, no-show, online/walk-in, bệnh nhân mới/quay lại |
| I2 | Dashboard KPI Bác sĩ |
| I3 | Dashboard KPI Lễ tân |
| I4 | Biểu đồ time-series theo giờ/ngày + bảng breakdown |
| I5 | Health check `/health`, `/api/v1/health` |
| I6 | Prometheus + Grafana monitoring |

**Tổng: 11 + 12 + 10 + 12 + 10 + 13 + 8 + 8 + 6 = 90 hạng mục.**

---

## 5. API BACKEND

### 5.1. Danh sách Controller (11)

| Controller | Tiền tố | Phạm vi |
| :--- | :--- | :--- |
| `AuthController` | `/api/v1/auth` | register, login, refresh, request-otp, verify-otp, resend-otp |
| `MeController` | `/api/v1/me` | hồ sơ, đổi mật khẩu, hồ sơ bệnh nhân/bác sĩ |
| `AdminUserController` | `/api/v1/admin/users` | CRUD người dùng, phân quyền, khóa, reset mật khẩu |
| `CatalogController` | `/api/v1` | chi nhánh, chuyên khoa, dịch vụ, danh mục bác sĩ |
| `AppointmentController` | `/api/v1/appointments` | đặt/đổi/hủy/tra cứu lịch hẹn, slot, đơn thuốc |
| `DoctorController` | `/api/v1/doctor` | hàng đợi, call/admit/lab/defer/miss/complete, lịch trực |
| `ReceptionController` | `/api/v1/reception` | check-in QR/CCCD, walk-in, quick-book, bill, invoice |
| `PaymentController` | `/api/v1/payments` | create, check-status, webhook, confirm, VNPay |
| `TriageController` | `/api/ai` | triage, chat, tools, tools/execute |
| `StatisticsController` | `/api/v1` | statistics/overview, admin/statistics/overview |
| `HealthController` | `/` , `/health` | health check |

> Hệ thống duy trì song song 2 tiền tố `/api/...` và `/api/v1/...` để tương thích ngược.

### 5.2. Phân quyền RBAC

| Nhóm đường dẫn | Quyền yêu cầu |
| :--- | :--- |
| `/api/v1/admin/**` | `ROLE_ADMIN` |
| `/api/v1/doctor/**` | `ROLE_DOCTOR`, `ROLE_ADMIN` |
| `/api/v1/doctor/schedules/**` | `ROLE_STAFF`, `ROLE_DOCTOR`, `ROLE_ADMIN` |
| `/api/v1/reception/**` | `ROLE_STAFF`, `ROLE_ADMIN` |
| `/api/ai/tools/execute` | Đã đăng nhập |
| auth, payment, health, danh mục công khai | `permitAll()` |

---

## 6. MÀN HÌNH FRONTEND (22 route)

| Nhóm | Route |
| :--- | :--- |
| Công khai | `/`, `/login`, `/register`, `/verify-otp`, `/forgot-password`, `/reset-password` |
| Bệnh nhân | `/booking`, `/booking-method`, `/my-appointments`, `/checkin`, `/profile` |
| Lễ tân | `/reception`, `/reception/history` |
| Bác sĩ | `/doctor`, `/doctor/schedule`, `/doctor/history` |
| Admin | `/admin`, `/admin/create-user`, `/admin/catalog`, `/admin/statistics` |
| Dùng chung | `/statistics`, `/vnpay-mock` |

---

## 7. CƠ SỞ DỮ LIỆU — 21 BẢNG / 4 PHÂN HỆ

| Phân hệ | Bảng |
| :--- | :--- |
| **1. Quản trị & Người dùng (5)** | `users`, `user_medical_center_roles`, `revoked_tokens`, `password_reset_tokens`, `system_settings` |
| **2. Danh mục & Ca trực (6)** | `medical_centers`, `specialties`, `services`, `doctors`, `doctor_schedules`, `time_slots` |
| **3. Bệnh nhân & Bệnh án (5)** | `patient_profiles`, `appointments`, `appointment_status_logs`, `medical_records`, `doctor_reviews` |
| **4. Dược phẩm & Viện phí (5)** | `medicines`, `prescriptions`, `prescription_items`, `invoices`, `payments` |

### Thiết kế đáng chú ý

- `time_slots.version` — phục vụ **Optimistic Locking + Atomic CAS**.
- `appointments.qr_code_token` — chuỗi mã hóa cho QR check-in.
- `appointment_status_logs` — audit toàn bộ chuyển đổi trạng thái ca khám.
- `payments.transaction_ref` — lưu mã tham chiếu ngân hàng từ webhook.

### Vòng đời trạng thái ca khám (theo `AppointmentStatus` thực tế)

```text
PENDING → CONFIRMED → CHECKED_IN → IN_PROGRESS → COMPLETED
                                        ↕
                            WAITING_FOR_LAB_RESULTS
Nhánh kết thúc khác: CANCELLED, MISSED_NO_SHOW
```

> Ghi chú: `defer` (tạm hoãn) và `lab` (chỉ định cận lâm sàng) hiện dùng chung trạng thái
> `WAITING_FOR_LAB_RESULTS`; giao diện hiển thị thành "Tạm hoãn" hoặc "Chờ kết quả CLS"
> tùy ngữ cảnh. Thao tác `call` chuyển ca thẳng sang `IN_PROGRESS` và tự thu hồi ca
> `IN_PROGRESS` trước đó của cùng bác sĩ về `CHECKED_IN` (đảm bảo quy tắc khám 1:1).

---

## 8. QUY TẮC NGHIỆP VỤ CỐT LÕI

1. **Atomic CAS chống double-booking**
   ```sql
   UPDATE time_slots
      SET status = 'BOOKED', version = version + 1
    WHERE id = :id AND status = 'AVAILABLE';
   ```
   Request thắng: `affected rows = 1` → HTTP 201. Request thua: `0` → **HTTP 409 Conflict**.

2. **Giữ chỗ 15 phút**: `AppointmentCleanupJob` quét mỗi 5 phút, hủy ca `PENDING` quá hạn và trả slot về `AVAILABLE`.

3. **Slot 30 phút**: chỉ hiển thị slot `AVAILABLE` và chưa qua thời điểm hiện tại.

4. **Khóa buồng khám trong ngày**: chỉ được đổi phòng trước ngày trực.

5. **Khám 1:1**: chưa hoàn tất / tạm hoãn ca hiện tại thì không gọi ca kế tiếp.

6. **Cron 17h**: tự tạo ca sáng/chiều cho ngày mai nếu bác sĩ chưa đăng ký.

7. **Bảo mật phiên**: mỗi tài khoản chỉ 1 phiên hoạt động; token cũ bị đưa vào `revoked_tokens`.

---

## 9. KIỂM THỬ & DEVOPS

| Hạng mục | Chi tiết |
| :--- | :--- |
| Unit / Integration Test | **27 test class, 160 `@Test`** — phủ booking/CAS, check-in, JWT, OTP, billing, statistics, AI guard, MCP tools, controller |
| CI/CD | `.github/workflows/ci.yml` — 3 job: backend test + bootJar, frontend `tsc --noEmit` + build, quality gate |
| Docker | Multi-stage, JRE Alpine, chạy non-root, `-Xmx384m` cho Render Free |
| Monitoring | `/actuator/prometheus` → Prometheus → Grafana (docker-compose sẵn) |
| MCP Server | Node.js (`@modelcontextprotocol/sdk`), bọc 9 tool y tế |
| API Spec | `openapi.yaml` + Postman collection |
| Khởi chạy | `start_all.bat` (Backend 8080 + Frontend 3000, tự mở trình duyệt) |
| Dữ liệu mẫu | `medsched_db.sql` — schema + seed data đầy đủ 4 vai trò |

### Tài khoản demo

| Vai trò | Email | Mật khẩu |
| :--- | :--- | :--- |
| Admin | `admin@medsched.vn` | `Medsched@123` |
| Lễ tân | `letan.q1@medsched.vn` | `Medsched@123` |
| Bác sĩ | `dr.minhanh@medsched.vn` | `Medsched@123` |
| Bệnh nhân | `benhnhan.demo@gmail.com` | `Medsched@123` |

---

## 10. ĐỘI NGŨ & PHÂN CÔNG

| Thành viên | Vai trò | Phụ trách chính |
| :--- | :---: | :--- |
| Châu Tuấn Kiệt | Leader | Kiến trúc, điều phối, tích hợp, thuyết trình |
| Nguyễn Văn Hiếu | Backend Dev | Use Case lõi, API slot, CAS, Spring Security JWT |
| Lê Thành Tài | Database / Persistence | Schema 3NF, toàn vẹn CSDL, adapter JPA |
| Nguyễn Thị Yến Nhi | BA | Đặc tả F01–F26, ma trận RBAC, UAT |
| Tân Cùng Bàn | AI Engineer | Spring AI, prompt triage, tóm tắt bệnh án, MCP |
| Trang Huynh | Frontend Dev | UI/UX Next.js, tích hợp API, phân quyền giao diện |

---

## 11. ĐÁNH GIÁ & VIỆC CẦN LÀM TRƯỚC DEMO DAY

### 11.1. Điểm mạnh

- Kiến trúc Hexagonal chuẩn, `core` độc lập hoàn toàn với framework.
- Xử lý tương tranh bằng CAS thực chất, có test chứng minh.
- State machine ca khám đầy đủ, có audit log.
- AI tích hợp ở mức tool-calling + RAG, không chỉ chat đơn thuần.
- Có CI/CD, Docker, monitoring, MCP — vượt yêu cầu đồ án thông thường.

### 11.2. Việc cần xử lý

| # | Vấn đề | Ưu tiên | Đề xuất |
| :---: | :--- | :---: | :--- |
| 1 | README ghi 17 bảng, thực tế **21 bảng** | Cao | Cập nhật README |
| 2 | README liệt kê 13 API, thực tế **~82 mapping** | Cao | Cập nhật bảng API |
| 3 | `docs/architecture/API_VA_TAI_KHOAN.md` nói build hỏng do thiếu Port — nay đã đủ | Cao | Cập nhật hoặc ghi chú “đã lỗi thời” |
| 4 | SRS ghi Java 17 / Spring 3.3 / Next 14 | Trung bình | Đồng bộ với Java 21 / 3.4.3 / Next 15 |
| 5 | README nhắc **Flyway** nhưng dự án không có Flyway | Trung bình | Bỏ khỏi tài liệu hoặc bổ sung thật |
| 6 | **Bí mật hardcode** trong `application.yml` (JWT secret, mật khẩu Gmail) và `PayOsService` (client-id/api-key/checksum) | **Cao** | Chuyển toàn bộ sang biến môi trường trước khi public repo |
| 7 | Bảng `doctor_reviews` có nhưng chưa expose API đánh giá bác sĩ | Thấp | Bổ sung hoặc ghi rõ “chưa triển khai” |
| 8 | Live feed dùng polling thay vì WebSocket | Thấp | Nêu rõ là giải pháp có chủ đích, đủ đáp ứng yêu cầu |

---

## 12. PHỤ LỤC — TÀI LIỆU LIÊN QUAN

| Tài liệu | Đường dẫn |
| :--- | :--- |
| Tổng quan dự án | `README.md` |
| Mục lục tài liệu | `docs/README.md` |
| SRS & SDS đầy đủ | `docs/DOCUMENTATION_SRS_SDS_MEDSCHED.md` |
| Danh sách API & tài khoản | `docs/architecture/API_VA_TAI_KHOAN.md` |
| Kiến trúc Frontend | `docs/architecture/FRONTEND_ARCHITECTURE.md` |
| Quy tắc nghiệp vụ FN | `docs/architecture/TongHopQuyTacFN.md` |
| Phân rã tính năng CAB | `docs/architecture/Danh_sach_CAB_dich_v2.md` |
| Kế hoạch kiểm thử theo vai trò | `Source_code/docs/DANH_SACH_CHUC_NANG_THEO_USER.md` |
| Hướng dẫn deploy | `docs/deployment/HUONG_DAN_DEPLOY_MEDSCHED.md` |
| Git Workflow | `docs/workflows/GIT_WORKFLOW.md` |
| API Spec | `Source_code/api-spec/openapi.yaml` |
| Báo cáo đáp ứng 5 yêu cầu | `BAO_CAO_DAP_UNG_5_YEU_CAU_THAY_BINH.md` |

---

*Tài liệu được kiểm kê trực tiếp từ mã nguồn nhánh `develop` (commit `cedf712`, phiên bản `1.3.1`), không sao chép từ tài liệu cũ.*
