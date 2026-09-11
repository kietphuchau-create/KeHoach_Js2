# Khung Sườn Task 1 — Xác Thực & Quản Lý Người Dùng

> **Trạng thái:** đã chạy được thật, không phải code mẫu. Toàn bộ 68 phép kiểm thử
> API tự động đều PASS trên MySQL/MariaDB của XAMPP (xem mục 6).
>
> **Mục đích:** làm sẵn phần xương sống (bảo mật, JWT, phân quyền, xử lý lỗi,
> chuẩn đặt tên) để các thành viên còn lại chỉ việc thêm tính năng của mình vào
> đúng chỗ, không ai phải dựng lại từ đầu và không lệch chuẩn giữa các phần.

---

## 1. Chạy trong 3 bước (bắt buộc dùng XAMPP)

```bash
# 1. Mở XAMPP Control Panel -> Start MySQL -> Mở phpMyAdmin (http://localhost/phpmyadmin)
#    Import file duy nhất: database/medsched_db.sql (tự tạo DB, 17 bảng và toàn bộ dữ liệu mẫu)
# 2. Chạy ứng dụng (hoặc click đúp start_all.bat):
cd backend
./gradlew :app:bootRun
```

File `database/medsched_db.sql` đã tích hợp trọn gói 17 bảng + dữ liệu mẫu vào database `medsched_db`.
**Không cần** Docker, **không cần** PostgreSQL, 100% XAMPP MySQL tiêu chuẩn.

| Tài khoản mẫu | Mật khẩu | Vai trò |
|:---|:---|:---|
| `benhnhan.demo@gmail.com` | `Medsched@123` | Khách hàng (Customer) |
| `dr.minhanh@medsched.vn` | `Medsched@123` | Bác sĩ (trực 2 chi nhánh) |
| `letan.q1@medsched.vn` | `Medsched@123` | Lễ tân (Staff) |
| `admin@medsched.vn` | `Medsched@123` | Quản trị viên (Admin) |

> Nếu MySQL của XAMPP chạy ở cổng khác 3306 hoặc có mật khẩu root, sửa bằng biến
> môi trường: `DB_URL`, `DB_USER`, `DB_PASSWORD` (xem `application.yml`).

---

## 2. Bản đồ thư mục — thêm code mới vào đâu

```
src/main/java/com/medsched/
├── MedSchedApplication.java     # điểm khởi động
│
├── security/                    # ❌ ĐỪNG SỬA nếu không thật sự cần
│   ├── SecurityConfig.java      #    khai báo route nào cần đăng nhập
│   ├── JwtService.java          #    sinh & kiểm tra JWT
│   ├── JwtAuthenticationFilter.java
│   ├── AppUserDetails.java      #    người dùng đã đăng nhập + quyền
│   └── AppUserDetailsService.java
│
├── common/                      # ❌ ĐỪNG SỬA
│   ├── ApiError.java            #    khuôn JSON lỗi dùng chung
│   ├── AppExceptions.java       #    NotFound / Conflict / BadRequest
│   └── GlobalExceptionHandler.java
│
├── auth/                        # ✅ Task 1 (đã xong): register, login, refresh
├── account/                     # ✅ Task 1 (đã xong): /me, đổi mật khẩu
├── admin/                       # ✅ Task 1 (đã xong): quản lý user, CRUD danh mục
│
├── <tinh-nang-cua-ban>/         # 👈 THÊM TÍNH NĂNG MỚI Ở ĐÂY
│   ├── XxxController.java       #    nhận request, kiểm tra quyền
│   ├── XxxService.java          #    xử lý nghiệp vụ + @Transactional
│   └── XxxDtos.java             #    các record request/response
│
└── persistence/                 # tầng dữ liệu (17 entity + 17 repository)
    ├── entity/  enums/  repository/
```

**Quy tắc 1 câu:** mỗi tính năng = 1 gói riêng gồm 3 file (`Controller`,
`Service`, `Dtos`), dùng lại `persistence` và `security` có sẵn.

---

## 3. Danh sách API đã làm xong

### 3.1. Không cần đăng nhập

| Method | Đường dẫn | Chức năng |
|:---|:---|:---|
| POST | `/api/v1/auth/register` | Customer tự đăng ký (tự tạo luôn hồ sơ người khám) |
| POST | `/api/v1/auth/login` | Đăng nhập **chung cho cả 4 vai trò** |
| POST | `/api/v1/auth/refresh` | Lấy access token mới bằng refresh token |

### 3.2. Cần đăng nhập (mọi vai trò)

| Method | Đường dẫn | Chức năng |
|:---|:---|:---|
| GET | `/api/v1/me` | Xem hồ sơ + quyền + hồ sơ bác sĩ (nếu là bác sĩ) |
| PUT | `/api/v1/me` | **Update Profile** (họ tên, điện thoại) |
| POST | `/api/v1/me/change-password` | **Change Password** |
| PUT | `/api/v1/me/patient-profile` | Cập nhật hồ sơ y tế của chính chủ |
| PUT | `/api/v1/me/doctor-profile` | Bác sĩ cập nhật học vị/kinh nghiệm/tiểu sử |
| GET | `/api/v1/medical-centers` · `/specialties` · `/services` | Xem danh mục |

### 3.3. Chỉ Admin

| Method | Đường dẫn | Chức năng |
|:---|:---|:---|
| GET | `/api/v1/admin/users?role=&centerId=&q=&page=&size=` | Danh sách user **lọc theo vai trò** |
| GET | `/api/v1/admin/users/{id}` | Chi tiết 1 user |
| POST | `/api/v1/admin/users/staff` | **Tạo tài khoản Lễ tân** |
| POST | `/api/v1/admin/users/doctors` | **Tạo tài khoản Bác sĩ** (kèm hồ sơ + giá khám) |
| PATCH | `/api/v1/admin/users/{id}/status` | Khóa / mở khóa tài khoản |
| POST | `/api/v1/admin/users/{id}/roles` | Cấp thêm quyền tại 1 chi nhánh |
| DELETE | `/api/v1/admin/users/{id}/roles/{assignmentId}` | Thu hồi quyền |
| POST/PUT/DELETE | `/api/v1/admin/medical-centers[/{id}]` | CRUD cơ sở y tế |
| POST/PUT/DELETE | `/api/v1/admin/specialties[/{id}]` | CRUD chuyên khoa |
| POST/PUT/DELETE | `/api/v1/admin/services[/{id}]` | CRUD dịch vụ khám |

`role` nhận: `ALL` · `CUSTOMER` · `ROLE_DOCTOR` · `ROLE_STAFF` · `ROLE_ADMIN`.

---

## 4. Cách thêm một tính năng mới (mẫu copy-paste)

**Bước 1 — Controller** (chỉ nhận request, kiểm tra quyền, không viết nghiệp vụ ở đây):

```java
@RestController
@RequestMapping("/api/v1/appointments")
public class AppointmentController {

    private final AppointmentService service;

    public AppointmentController(AppointmentService service) {  // tiêm qua constructor
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<AppointmentDtos.Response> book(
            @AuthenticationPrincipal AppUserDetails principal,   // lấy người đang đăng nhập
            @Valid @RequestBody AppointmentDtos.BookRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.book(principal, request));
    }

    @GetMapping("/queue")
    @PreAuthorize("hasRole('STAFF')")                            // chặn quyền ở đây
    public List<AppointmentDtos.QueueItem> queue() {
        return service.queueOfToday();
    }
}
```

**Bước 2 — Service** (nghiệp vụ + giao dịch):

```java
@Service
public class AppointmentService {

    private final AppointmentJpaRepository appointments;   // repository đã có sẵn

    @Transactional
    public AppointmentDtos.Response book(AppUserDetails principal, AppointmentDtos.BookRequest request) {
        var slot = slots.findById(request.slotId())
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy khung giờ"));
        if (slot.getStatus() != SlotStatus.AVAILABLE) {
            throw new AppExceptions.ConflictException("Khung giờ này vừa có người đặt");
        }
        ...
    }
}
```

**Bước 3 — DTO** (dùng `record`, đặt validate ngay trên trường):

```java
public final class AppointmentDtos {
    public record BookRequest(
            @NotBlank(message = "Phải chọn khung giờ") String slotId,
            @Size(max = 2000) String symptoms) {}

    public record Response(String bookingCode, String queueNumber, Instant startTime) {}
}
```

### Quy ước phải theo (để code cả nhóm đồng bộ)

| Việc | Cách làm đã thống nhất |
|:---|:---|
| Báo lỗi | Ném `AppExceptions.NotFoundException` / `ConflictException` / `BadRequestException` — **không** tự `ResponseEntity.badRequest()`. Bộ xử lý chung sẽ trả JSON đúng khuôn. |
| Kiểm tra dữ liệu vào | Đặt annotation `@NotBlank`, `@Size`, `@Pattern`... trên record + `@Valid` ở controller |
| Phân quyền | `@PreAuthorize("hasRole('ADMIN')")` — viết `ADMIN`, **không** viết `ROLE_ADMIN` |
| Lấy người đăng nhập | `@AuthenticationPrincipal AppUserDetails principal` rồi `principal.getUserId()` |
| Sinh khóa chính | `UUID.randomUUID().toString()` ở tầng Java (DB không tự sinh) |
| Ghi vết | Set `createdBy`/`updatedBy` = `principal.getUserId()`, `updatedAt` = `Instant.now()` |
| Đổi cấu trúc bảng | Thêm file `V3__ten_thay_doi.sql` trong `db/migration/mysql` **và** `postgresql` — **không sửa** V1/V2 đã chạy |

---

## 5. Phân công gợi ý cho nhóm

| Phần việc | Gợi ý người làm | Ghi chú |
|:---|:---|:---|
| ✅ Task 1 (đã xong) | Tài | Khung sườn này |
| Đặt lịch + hàng đợi (Luồng 1, 5) | Hiếu | Thêm gói `appointment/`, dùng `TimeSlotJpaRepository#compareAndSetStatus` đã có sẵn cho chống đặt trùng |
| Check-in QR + tiếp đón (Luồng 2) | Hiếu / Nhi | Thêm gói `checkin/` |
| Khám bệnh + đơn thuốc (Luồng 3) | Nhi | Dùng `prescription_items` + `medicines` |
| Spring AI (Triage, tóm tắt, sentiment) | Tân | Thêm gói `ai/`, gọi từ Service, **không** gọi từ Controller |
| Giao diện Next.js | Trang | CORS đã mở sẵn cho `http://localhost:3000` |
| Thanh toán (Giai đoạn 2) | (sau) | Bảng `payments` đã thiết kế xong |

---

## 6. Kết quả kiểm thử thực tế

Chạy `bash test-task1.sh` khi ứng dụng đang bật:

```
===== 1. REGISTER (Customer) =====        6/6 PASS
===== 2. LOGIN (4 vai tro) =====          6/6 PASS
===== 3. GET /me =====                    5/5 PASS
===== 4. UPDATE PROFILE =====             8/8 PASS
===== 5. CHANGE PASSWORD =====            6/6 PASS
===== 6. ADMIN - QUAN LY USER =====       7/7 PASS
===== 7. ADMIN - TAO STAFF & DOCTOR =====  8/8 PASS
===== 8. ADMIN - KHOA/MO KHOA =====       4/4 PASS
===== 9. ADMIN - CRUD DANH MUC =====     13/13 PASS
===== 10. REFRESH TOKEN =====             4/4 PASS
===================================================
 KET QUA: 68 PASS / 0 FAIL
===================================================
```

Bộ test kiểm cả các tình huống **phải bị từ chối**, không chỉ đường đi thuận lợi:
đăng ký trùng email (409), sai mật khẩu (401), email không tồn tại cũng trả 401
(không để lộ email nào đã đăng ký), bệnh nhân gọi API admin (403), lễ tân gọi API
admin (403), token giả mạo (401), dùng refresh token để gọi API (401), dùng access
token để refresh (400), tài khoản bị khóa không đăng nhập được, giá dịch vụ âm
(400), xóa chuyên khoa đang có bác sĩ (409).

---

## 7. Những điểm bảo mật đã xử lý sẵn

1. **Mật khẩu** băm BCrypt (cost 10), không bao giờ trả về trong response.
2. **Không lộ email đã đăng ký**: sai mật khẩu và email không tồn tại cùng trả 401 với thông báo giống hệt nhau.
3. **Access token vs refresh token tách biệt** bằng claim `typ` — refresh token không gọi được API nghiệp vụ.
4. **Thu hồi quyền có hiệu lực ngay**: mỗi request đều nạp lại quyền từ DB, không tin tuyệt đối vào token cũ.
5. **Khóa tài khoản chặn đăng nhập ngay lập tức**.
6. **JWT secret bắt buộc ≥ 32 ký tự**, ứng dụng từ chối khởi động nếu secret yếu. Khi deploy thật phải đặt biến môi trường `JWT_SECRET`.
7. **Admin không tự khóa được chính mình** (tránh khóa nhầm mất quyền quản trị).

### Còn lại cho giai đoạn sau
* Refresh token hiện là JWT không lưu DB ⇒ chưa thu hồi được từng token. Nếu cần, thêm bảng `refresh_tokens` ở V3.
* Chưa giới hạn số lần đăng nhập sai (rate limit) — nên thêm khi triển khai thật.
* Chưa có xác minh email / quên mật khẩu.
