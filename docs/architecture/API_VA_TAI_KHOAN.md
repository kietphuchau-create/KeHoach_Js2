# Danh Sách API & Tài Khoản — Dự Án MedSched

> Tài liệu này liệt kê **toàn bộ API hiện có**, **cái nào chạy được / cái nào chưa**, và
> **các tài khoản dùng để đăng nhập thử**.
>
> Cập nhật: 14/09/2026 — đối chiếu trực tiếp với code trên nhánh `main`
> (commit `afda080`), không phải chép từ tài liệu cũ.

---

## ⚠️ Đọc trước: trạng thái build hiện tại

**Nhánh `main` hiện KHÔNG biên dịch được.** Đã chạy thử `javac` trên toàn bộ 81 file
`.java` → 0 file `.class` được sinh ra.

**Nguyên nhân:** có 3 interface bị thiếu trong repo (nhiều khả năng quên `git add`):

```
com.medsched.core.port.out.AppointmentRepositoryPort
com.medsched.core.port.out.TimeSlotRepositoryPort
com.medsched.core.port.out.AiTriagePort
```

Thư mục `core/src/main/java/com/medsched/core/port/out/` hiện có **0 file**, và cũng
**chưa có class nào implements** 3 interface đó (tức chưa có adapter nối xuống DB / Spring AI).

**5 file đang import chúng nên build đứng lại:**

| File | Thuộc phần |
|:---|:---|
| `app/adapter/in/web/AppointmentController.java` | Đặt lịch |
| `app/adapter/in/web/TriageController.java` | AI phân luồng |
| `app/config/UseCaseConfig.java` | Khai báo bean |
| `core/usecase/BookAppointmentService.java` | Nghiệp vụ đặt lịch |
| `core/usecase/CheckinService.java` | Nghiệp vụ tiếp đón |

**Hệ quả:** vì cả dự án là một ứng dụng Spring Boot duy nhất, lỗi này làm **chết luôn
nhóm API Task 1 vốn đang chạy tốt**. Cần bổ sung 3 interface + adapter trước khi chạy.

**Đã kiểm chứng:** bỏ riêng 4 file lỗi ra thì 67 file còn lại (Task 1 + tầng dữ liệu)
compile sạch, sinh 95 file `.class` — tức phần Task 1 không có lỗi gì.

---

## 1. Nhóm API Xác Thực — ✅ chạy được, đã kiểm thử

Không cần đăng nhập.

| Method | Đường dẫn | Làm được gì |
|:---|:---|:---|
| POST | `/api/v1/auth/register` | Khách hàng tự đăng ký. Hệ thống tự tạo luôn hồ sơ người khám (`SELF`) để đặt lịch được ngay. Chặn trùng email (409), kiểm tra định dạng email/mật khẩu/điện thoại (400) |
| POST | `/api/v1/auth/login` | Đăng nhập **dùng chung cho cả 4 vai trò**. Trả access token + refresh token + danh sách quyền. Sai mật khẩu và email không tồn tại đều trả 401 với thông báo giống nhau (không để lộ email nào đã đăng ký) |
| POST | `/api/v1/auth/refresh` | Đổi refresh token lấy access token mới. Không thể dùng access token để refresh, và không thể dùng refresh token để gọi API nghiệp vụ |

**Cách dùng token:** thêm header `Authorization: Bearer <accessToken>` vào mọi request sau đó.
Access token sống 30 phút, refresh token 7 ngày.

---

## 2. Nhóm API Tài Khoản Cá Nhân — ✅ chạy được, đã kiểm thử

Cần đăng nhập. Dùng chung cho **cả 4 vai trò** nên không cần 4 bộ API riêng.

| Method | Đường dẫn | Làm được gì |
|:---|:---|:---|
| GET | `/api/v1/me` | Xem hồ sơ: thông tin tài khoản, danh sách quyền theo chi nhánh, hồ sơ bác sĩ (nếu là bác sĩ), hồ sơ y tế cá nhân |
| PUT | `/api/v1/me` | **Update Profile** — sửa họ tên, số điện thoại |
| POST | `/api/v1/me/change-password` | **Change Password** — bắt nhập đúng mật khẩu cũ, chặn đặt lại trùng mật khẩu cũ, chặn mật khẩu dưới 8 ký tự |
| PUT | `/api/v1/me/patient-profile` | Cập nhật hồ sơ y tế của chính chủ: CCCD, BHYT, ngày sinh, giới tính, địa chỉ, tiền sử bệnh |
| PUT | `/api/v1/me/doctor-profile` | **Chỉ bác sĩ** — cập nhật học vị, số năm kinh nghiệm, tiểu sử, ảnh đại diện. Áp dụng cho tất cả chi nhánh mà bác sĩ đó đang trực. Cố ý **không** cho bác sĩ tự sửa giá khám và số phòng (thuộc quyền Admin) |

---

## 3. Nhóm API Quản Trị Người Dùng — ✅ chạy được, đã kiểm thử

Yêu cầu quyền `ROLE_ADMIN`. Tài khoản khác gọi vào sẽ nhận 403.

| Method | Đường dẫn | Làm được gì |
|:---|:---|:---|
| GET | `/api/v1/admin/users?role=&centerId=&q=&page=&size=` | Danh sách người dùng **lọc theo vai trò**, tìm theo email/tên, có phân trang |
| GET | `/api/v1/admin/users/{userId}` | Xem chi tiết 1 tài khoản kèm các quyền đã cấp |
| POST | `/api/v1/admin/users/staff` | **Tạo tài khoản Lễ tân** và gán quyền tại đúng chi nhánh |
| POST | `/api/v1/admin/users/doctors` | **Tạo tài khoản Bác sĩ**: tạo user + cấp quyền + tạo hồ sơ bác sĩ (học vị, kinh nghiệm, giá khám, phòng). Chi nhánh suy ra từ chuyên khoa nên không gán nhầm được |
| PATCH | `/api/v1/admin/users/{userId}/status` | **Khóa / mở khóa tài khoản.** Khóa xong là không đăng nhập được ngay. Admin không tự khóa được chính mình |
| POST | `/api/v1/admin/users/{userId}/roles` | Cấp thêm quyền cho tài khoản tại một chi nhánh |
| DELETE | `/api/v1/admin/users/{userId}/roles/{assignmentId}` | Thu hồi quyền (đánh dấu ngừng hiệu lực, vẫn giữ lịch sử ai từng làm ở đâu) |

Tham số `role` nhận: `ALL` · `CUSTOMER` · `ROLE_DOCTOR` · `ROLE_STAFF` · `ROLE_ADMIN`.
`CUSTOMER` = tài khoản không có quyền nhân sự nào.

---

## 4. Nhóm API Danh Mục — ✅ chạy được, đã kiểm thử

Xem danh sách: mọi tài khoản đã đăng nhập. Thêm/sửa/xóa: chỉ `ROLE_ADMIN`.

| Method | Đường dẫn | Làm được gì |
|:---|:---|:---|
| GET | `/api/v1/medical-centers` | Danh sách cơ sở y tế |
| POST/PUT/DELETE | `/api/v1/admin/medical-centers[/{id}]` | Thêm / sửa / ngừng hoạt động cơ sở y tế (xóa mềm để giữ lịch sử khám) |
| GET | `/api/v1/specialties?centerId=` | Danh sách chuyên khoa |
| POST/PUT/DELETE | `/api/v1/admin/specialties[/{id}]` | Thêm / sửa / xóa chuyên khoa. **Chặn xóa** chuyên khoa đang có bác sĩ (409) |
| GET | `/api/v1/services?specialtyId=` | Danh sách dịch vụ khám kèm giá |
| POST/PUT/DELETE | `/api/v1/admin/services[/{id}]` | Thêm / sửa / ngừng cung cấp dịch vụ. Chặn giá âm, chặn trùng mã dịch vụ trong cùng chuyên khoa |

---

## 5. Nhóm API Mới — ⚠️ chưa chạy được (thiếu file)

Đã có Controller nhưng **thiếu interface + adapter** nên chưa build được (xem mục cảnh báo đầu trang).
Lưu ý đường dẫn nhóm này dùng tiền tố `/api/...`, **khác** với `/api/v1/...` của 4 nhóm trên.

| Method | Đường dẫn | Dự kiến làm gì | Còn thiếu |
|:---|:---|:---|:---|
| POST | `/api/appointments` | Đặt lịch khám | `AppointmentRepositoryPort`, `TimeSlotRepositoryPort` + adapter |
| GET | `/api/appointments/{id}` | Xem 1 ca khám | như trên |
| GET | `/api/appointments/booking-code/{code}` | Tra ca khám theo mã đặt chỗ | như trên |
| GET | `/api/appointments/patient/{patientProfileId}` | Lịch sử khám của 1 hồ sơ bệnh nhân | như trên |
| POST | `/api/reception/checkin/qr` | Check-in bằng mã QR vé hẹn | `AppointmentRepositoryPort` + adapter |
| POST | `/api/reception/checkin/cccd` | Check-in bằng CCCD | như trên |
| POST | `/api/ai/triage` | Spring AI gợi ý chuyên khoa + tóm tắt bệnh án | `AiTriagePort` + adapter gọi Spring AI |

**Ghi chú bảo mật:** nhóm API này hiện chưa gắn `@PreAuthorize`, nên khi build được thì
mọi tài khoản đã đăng nhập đều gọi được — kể cả bệnh nhân gọi API tiếp đón. Nên thêm
`@PreAuthorize("hasRole('STAFF')")` cho nhóm `/api/reception/**`.

---

## 6. Tài khoản đăng nhập thử

**Mật khẩu của tất cả tài khoản: `Medsched@123`**

| Email | Vai trò | Quyền / Phạm vi |
|:---|:---|:---|
| `benhnhan.demo@gmail.com` | Khách hàng | Không có quyền nhân sự nào — đặt lịch được ở **mọi chi nhánh** |
| `dr.minhanh@medsched.vn` | Bác sĩ | `ROLE_DOCTOR` tại **cả 2 chi nhánh** (Quận 1 và Quận 7), có 2 hồ sơ hành nghề |
| `letan.q1@medsched.vn` | Lễ tân | `ROLE_STAFF` tại chi nhánh Quận 1 |
| `admin@medsched.vn` | Quản trị viên | `ROLE_ADMIN` tại chi nhánh Quận 1 |

### Vì sao không có tài khoản nào ghi vai trò "bệnh nhân"?

Theo thiết kế CSDL bản 3.x: **mọi tài khoản đều mặc định đặt lịch khám được ở mọi chi
nhánh**, nên "bệnh nhân" không phải quyền cần cấp. Bảng `user_medical_center_roles` chỉ
lưu quyền **nhân sự** (`ROLE_DOCTOR`, `ROLE_STAFF`, `ROLE_ADMIN`) và có phạm vi theo từng
chi nhánh. Tài khoản không có dòng nào trong bảng này chính là khách hàng thuần.

Nhờ vậy 1 bệnh nhân đăng ký **một lần** là khám được ở mọi cơ sở, dùng chung hồ sơ bệnh
án — không phải tạo tài khoản mới khi đổi chi nhánh.

### Dữ liệu mẫu kèm theo

- 2 chi nhánh: `MED_Q1` (Quận 1), `MED_Q7` (Quận 7)
- 5 chuyên khoa, 3 dịch vụ khám (Khám Da liễu cơ bản 300.000đ, Laser vết nám 1.200.000đ, Khám Nội tổng quát 250.000đ)
- 2 ca khám mẫu của **cùng 1 bệnh nhân ở 2 chi nhánh khác nhau**, kèm đơn thuốc và 2 lần thanh toán

---

## 7. Cách chạy để thử API

```bash
# 1. Bật MySQL trong XAMPP Control Panel
# 2. Chạy backend (Flyway tự tạo database medsched_db + dữ liệu mẫu)
cd Source_code/backend
./gradlew bootRun            # backend chạy ở cổng 8080

# 3. Frontend (Next.js, gọi backend qua localhost:8080)
cd Source_code/frontend
pnpm install && pnpm dev
```

Ví dụ đăng nhập bằng lệnh:

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@medsched.vn","password":"Medsched@123"}'
```

> Bước 2 **hiện sẽ báo lỗi biên dịch** cho tới khi bổ sung 3 interface `port/out` còn thiếu.

---

## 8. Giao diện đã có (Next.js)

| Trang | Đường dẫn |
|:---|:---|
| Trang chủ | `/` |
| Đăng nhập / Đăng ký | `/login`, `/register` |
| Hồ sơ cá nhân | `/profile` |
| Đặt lịch khám | `/booking` |
| Quầy tiếp đón | `/reception` |
| Quản trị + Tạo tài khoản | `/admin`, `/admin/create-user` |

---

## 9. Tóm tắt nhanh

| Nhóm chức năng | Trạng thái |
|:---|:---|
| Đăng ký / Đăng nhập / Refresh token | ✅ Chạy được, đã kiểm thử |
| Xem & sửa hồ sơ, đổi mật khẩu (4 vai trò) | ✅ Chạy được, đã kiểm thử |
| Admin quản lý user, tạo Lễ tân / Bác sĩ, khóa tài khoản, phân quyền | ✅ Chạy được, đã kiểm thử |
| Admin CRUD cơ sở y tế / chuyên khoa / dịch vụ | ✅ Chạy được, đã kiểm thử |
| Đặt lịch khám | ⚠️ Có Controller, thiếu port + adapter |
| Tiếp đón / Check-in QR & CCCD | ⚠️ Có Controller, thiếu port + adapter |
| Spring AI phân luồng chuyên khoa | ⚠️ Có Controller, thiếu port + adapter |
| Thanh toán, kê đơn thuốc | ❌ Mới có bảng CSDL, chưa có API |
