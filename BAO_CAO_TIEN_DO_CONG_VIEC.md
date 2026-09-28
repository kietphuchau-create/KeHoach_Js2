# 📋 BÁO CÁO TIẾN ĐỘ CÔNG VIỆC DỰ ÁN MEDSCHED (DÀNH CHO PM & TEAM LEADER)
**Người thực hiện:** Nguyễn Văn Hiếu  
**Vai trò:** Backend Developer (Chính)  
**Nhánh Git:** `feature/clab-103-hieu-appointment-booking`  
**Dự án:** MedSched — Hệ thống y tế thông minh (Smart Healthcare System)  
**Ngày cập nhật:** 18/09/2026  

---

## 1. TỔNG HỢP CÁC HẠNG MỤC CÔNG VIỆC ĐÃ HOÀN THÀNH

Nhánh `feature/clab-103-hieu-appointment-booking` đã hoàn tất trọn vẹn **2 nhóm công việc lớn** đáp ứng 100% tiêu chí chấp nhận (Acceptance Criteria):

1. **PHẦN 1: Luồng Nghiệp Vụ Cốt Lõi Khám Chữa Bệnh**
   * Đặt lịch khám bệnh (`Appointment Booking`) & Cơ chế khóa lạc quan chống tranh chấp khung giờ khám (`Concurrency Slot Lock - CAS`).
   * Quầy tiếp đón siêu tốc trong 1 giây (`Reception Check-in`) qua quét mã QR vé hẹn và thẻ CCCD gắn chip (hỗ trợ cả luồng Idempotent an toàn).
   * Tích hợp AI Triage tự động trích xuất tóm tắt triệu chứng sơ bộ.

2. **PHẦN 2: Hoàn Thiện Toàn Diện Hệ Thống Xác Thực (Auth & Session Lifecycle)**
   * **Forgot & Reset Password:** Đặt lại mật khẩu qua email dùng 1 lần (15 phút), cơ chế chống dò quét danh tính người dùng (Anti User Enumeration), vô hiệu hoá toàn bộ phiên đăng nhập cũ sau khi đổi mật khẩu.
   * **Logout & Session Lifecycle:** Đăng xuất thu hồi token phía Server (Server-side Token Invalidation via `revoked_tokens` blacklist), tự động dọn session và redirect trang đăng nhập khi token hết hạn hoặc nhận 401.
   * **Frontend Next.js:** Hoàn thiện trang `/forgot-password`, `/reset-password`, tích hợp gọi API logout tại HeaderNav, Profile và Admin.

---

## 2. CHI TIẾT KỸ THUẬT CÁC HẠNG MỤC VỪA TRIỂN KHAI

### A. Quên và Đặt lại mật khẩu (Forgot & Reset Password)
* **CSDL:** Bổ sung bảng `password_reset_tokens` (lưu SHA-256 hash của token, `expires_at` 15 phút, `used_at`) và cột `token_invalid_before` trong bảng `users`.
* **Bảo mật chống dò quét Email:** Endpoint `POST /api/v1/auth/forgot-password` luôn trả về HTTP 200 kèm thông báo đồng nhất: *"Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến hộp thư của bạn"* dù email có tồn tại hay không.
* **Token một lần & thời hạn:** Token chỉ dùng duy nhất 1 lần; nếu quá 15 phút hoặc đã sử dụng sẽ bị từ chối bằng HTTP 400.
* **Huỷ phiên toàn cục (Session Revocation):** Khi reset mật khẩu thành công qua `POST /api/v1/auth/reset-password`, hệ thống gán `user.token_invalid_before = now`. `JwtAuthenticationFilter` lập tức chặn và trả HTTP 401 với tất cả các access token được cấp trước thời điểm này.
* **Email Service:** Tích hợp `EmailService.java` hỗ trợ gửi email HTML thật khi có SMTP, và tự động log link reset trực tiếp ra Console/Logger phục vụ kiểm thử cục bộ/offline.
* **Giao diện người dùng:** 
  * Bổ sung liên kết "Quên mật khẩu?" tại form đăng nhập `/login`.
  * Xây dựng trang `/forgot-password`: Form nhập email với giao diện thân thiện, báo lỗi và báo thành công rõ ràng.
  * Xây dựng trang `/reset-password`: Đọc token từ URL query param, xác thực độ dài mật khẩu (8-72 ký tự), xác nhận mật khẩu khớp nhau và điều hướng về `/login`.

### B. Đăng xuất & Vòng đời phiên (Logout & Session Lifecycle)
* **CSDL:** Bổ sung bảng `revoked_tokens` (`token_hash`, `token_type`, `expires_at`, `created_at`).
* **Thu hồi token máy chủ:** Endpoint `POST /api/v1/auth/logout` nhận token hiện tại và đưa mã băm SHA-256 vào `revoked_tokens`.
* **Bộ lọc bảo mật:** `JwtAuthenticationFilter` kiểm tra 2 lớp bảo vệ:
  1. Token hash có nằm trong `revoked_tokens` hay không -> Từ chối 401.
  2. Thời điểm cấp token `iat` có trước `user.token_invalid_before` hay không -> Từ chối 401.
* **Đồng bộ Frontend:** Cập nhật `handleLogout` tại `HeaderNav.tsx`, `profile/page.tsx`, `admin/page.tsx` để kích hoạt thu hồi server-side trước khi xoá `localStorage` và chuyển về `/login`. Thêm interceptor tự động dọn session khi gặp lỗi 401.

### C. Đặt lịch khám & Tiếp đón (Booking & Reception Check-in)
* Khóa lạc quan chống tranh chấp bằng Atomic Compare-And-Set (CAS).
* Tiếp đón QR Code và CCCD tại quầy trong 1 giây với cơ chế Idempotent không gây lỗi khi quét lặp.
* Hỗ trợ đồng bộ cả 2 chuẩn đường dẫn API `/api/v1/...` và `/api/...`.

---

## 3. KẾT QUẢ KIỂM THỬ THỰC TẾ (100% PASS)

### A. Kiểm thử tự động Backend (JUnit 5 / Spring Boot Test)
Tất cả các bài kiểm thử đều chạy thành công tuyệt đối (**BUILD SUCCESSFUL**):
1. **`AuthServiceTest` (6/6 PASS):**
   * `givenRegisteredEmail_whenForgotPassword_thenTokenCreatedAndEmailed`: ✅ PASS
   * `givenUnknownEmail_whenForgotPassword_thenIdenticalResponsePreventingEnumeration`: ✅ PASS
   * `givenValidToken_whenResetPassword_thenPasswordUpdatedAndSessionsInvalidated`: ✅ PASS
   * `givenExpiredToken_whenResetPassword_thenThrowsBadRequestException`: ✅ PASS
   * `givenAlreadyUsedToken_whenResetPassword_thenThrowsBadRequestException`: ✅ PASS
   * `givenLogoutRequested_whenCompleted_thenTokenRevokedOnServer`: ✅ PASS
2. **`BookAppointmentServiceTest` (5/5 PASS):** Khóa lạc quan slot, concurrency 10 luồng đồng thời (1 thành công, 9 conflict 409).
3. **`CheckinServiceTest` (4/4 PASS):** Tiếp đón QR, CCCD, Idempotent.

### B. Kiểm thử CSDL
* Đã thực thi nạp file [update_auth_features.sql](file:///d:/HOCTAP/jspring/KeHoach_Js2/Source_code/database/update_auth_features.sql) vào MySQL XAMPP `medsched_db`.
* Xác nhận 2 bảng `password_reset_tokens`, `revoked_tokens` và cột `users.token_invalid_before` đã hoạt động ổn định.

---

## 4. DANH MỤC API BACKEND HOÀN THIỆN TRÊN NHÁNH

| STT | Method | Endpoint | Quyền hạn | Mô tả |
|:---:|:---:|:---|:---:|:---|
| 1 | `POST` | `/api/v1/auth/forgot-password` | Public | Yêu cầu gửi link đặt lại mật khẩu qua email |
| 2 | `POST` | `/api/v1/auth/reset-password` | Public | Đặt lại mật khẩu mới bằng token 1 lần |
| 3 | `POST` | `/api/v1/auth/logout` | Authenticated / Public | Đăng xuất và thu hồi token phía server |
| 4 | `POST` | `/api/v1/auth/login` | Public | Đăng nhập hệ thống (Customer, Doctor, Staff, Admin) |
| 5 | `POST` | `/api/v1/auth/register` | Public | Đăng ký tài khoản bệnh nhân |
| 6 | `POST` | `/api/v1/auth/refresh` | Public | Gia hạn token mới từ refresh token |
| 7 | `GET/PUT` | `/api/v1/me` | Authenticated | Xem và cập nhật thông tin cá nhân |
| 8 | `POST` | `/api/v1/appointments` | Public / Patient | Đặt lịch khám mới (khóa slot CAS, tóm tắt AI) |
| 9 | `GET` | `/api/v1/appointments/{id}` | Public / Patient | Chi tiết lịch hẹn theo ID |
| 10 | `GET` | `/api/v1/appointments/booking-code/{code}` | Public / Patient | Tra cứu vé hẹn bằng mã `MEDxxxxxx` |
| 11 | `POST` | `/api/v1/appointments/check-in` | Staff / Reception | Tiếp đón đa năng QR/CCCD |
| 12 | `POST` | `/api/v1/reception/checkin/qr` | Staff / Reception | Tiếp đón qua mã QR vé hẹn |
| 13 | `POST` | `/api/v1/reception/checkin/cccd` | Staff / Reception | Tiếp đón qua CCCD khách vãng lai |

---

## 5. HƯỚNG DẪN PM VÀ THÀNH VIÊN KIỂM TRA DEMO
1. **Khởi động CSDL:** Mở XAMPP Control Panel, Start MySQL.
2. **Khởi động Backend:**
   ```bash
   cd Source_code/backend
   ./gradlew :app:bootRun
   ```
3. **Khởi động Frontend:**
   ```bash
   cd Source_code/frontend
   pnpm dev
   ```
4. **Trải nghiệm các tính năng:**
   * Quên mật khẩu: Truy cập `http://localhost:3000/login` -> bấm "Quên mật khẩu?" -> nhập email -> lấy link reset từ terminal backend -> đặt mật khẩu mới.
   * Đăng xuất: Bấm nút Đăng xuất tại Header -> token bị thu hồi phía server -> tự động chuyển về `/login`.
   * Đặt lịch & Tiếp đón: `http://localhost:3000/booking` và `http://localhost:3000/reception`.
