# CLAB-102 — Backend Auth (Tài)

> Nhánh: `feature/clab-102-tai-backend-auth`
> Bản tiếng Anh: [CLAB-102_BACKEND_AUTH_EN.md](./CLAB-102_BACKEND_AUTH_EN.md)

## 1. Tóm tắt

Phần xác thực (đăng ký / đăng nhập / phân quyền) đã có sẵn code từ Task 1, nhưng
sau khi gộp mã nguồn của 6 thành viên và tái cấu trúc thư mục thì **backend không
còn khởi động được**. Việc của CLAB-102 là làm cho phần auth chạy lại đúng trong
cấu trúc mới, sửa các lỗi chặn đường, và bổ sung kiểm thử tự động.

**Kết quả:** ứng dụng khởi động lại được, 16/16 test tự động PASS, đã kiểm chứng
đăng nhập thật trên MySQL của XAMPP.

## 2. Bốn lỗi đã tìm ra và sửa

### 2.1. Ứng dụng không khởi động được với chính file CSDL của nhóm ⛔

* **Triệu chứng:** chạy `bootRun` là gãy hàng loạt lỗi
  `Cannot change column 'appointment_id': used in a foreign key constraint`.
* **Nguyên nhân:** `database/medsched_db.sql` tạo cột khóa kiểu `CHAR(36)`, trong
  khi Entity JPA khai báo `@Column(length = 36)` — Hibernate hiểu là `varchar(36)`.
  Cấu hình `ddl-auto: update` khiến Hibernate cố `ALTER` lại 75 cột cho khớp, nhưng
  MySQL từ chối vì các cột đó đang bị khóa ngoại tham chiếu.
* **Cách sửa:**
  1. Đổi toàn bộ `CHAR(36)` → `VARCHAR(36)` trong `database/medsched_db.sql` (75 chỗ).
  2. Đổi `ddl-auto: update` → **`validate`**: file SQL là nguồn sự thật duy nhất,
     Hibernate chỉ đối chiếu chứ không được tự sửa bảng. Lệch schema sẽ báo lỗi
     ngay lúc khởi động thay vì âm thầm sửa dữ liệu.

### 2.2. Cấu hình thời hạn token bị bỏ qua âm thầm

* **Triệu chứng:** `application.yml` đặt `access-token-duration: 3600s` (1 giờ)
  nhưng token phát ra chỉ sống 30 phút.
* **Nguyên nhân:** `JwtService` đọc key `medsched.jwt.access-ttl` / `refresh-ttl` —
  hai tên này **không tồn tại** trong file cấu hình, nên Spring lấy giá trị mặc
  định trong code (30 phút). Không có lỗi nào được báo.
* **Cách sửa:** đổi `JwtService` đọc đúng tên key của nhóm
  (`access-token-duration` / `refresh-token-duration`).
* **Kiểm chứng:** đăng nhập thật trả về `expiresIn: 3600` (trước đó là `1800`).

### 2.3. Thiếu OpenAI API key là cả backend không chạy được

* **Triệu chứng:** `OpenAI API key must be set` → ứng dụng dừng khi khởi động.
* **Ảnh hưởng:** ai không có key OpenAI thì **không chạy nổi backend**, kể cả khi
  chỉ làm Auth, Đặt lịch hay Frontend.
* **Cách sửa:** cho key một giá trị mặc định: `${OPENAI_API_KEY:chua-cau-hinh}`.
  Ứng dụng khởi động bình thường; chỉ các API gọi AI mới báo lỗi khi chưa có key.
  Ai làm phần AI chỉ cần đặt biến môi trường `OPENAI_API_KEY` là chạy đủ.

### 2.4. Clone repo về không chạy được `./gradlew`

* **Nguyên nhân:** `.gitignore` có dòng `*.jar` nên **`gradle-wrapper.jar` chưa bao
  giờ được đưa lên Git**. Ai clone repo về đều gặp `Unable to access jarfile`.
* **Cách sửa:** thêm ngoại lệ `!**/gradle/wrapper/gradle-wrapper.jar` và commit file
  jar này (đây là chuẩn chung của mọi dự án Gradle).

## 3. Kiểm thử tự động đã bổ sung

Trước đó **toàn bộ backend không có một test nào**. Đã thêm 16 test:

| File | Số test | Nội dung |
|:---|:---:|:---|
| `app/src/test/java/com/medsched/security/JwtServiceTest.java` | 8 | Token mang đúng danh tính/quyền; access và refresh không bị nhầm lẫn; từ chối token ký bằng secret khác, token bị sửa chữ ký, token hết hạn; chặn secret yếu (< 32 ký tự); `expiresIn` lấy đúng từ cấu hình |
| `app/src/test/java/com/medsched/auth/AuthServiceTest.java` | 8 | Đăng ký tạo kèm hồ sơ khám `SELF`; chuẩn hóa email về chữ thường; mật khẩu phải được băm BCrypt; trùng email bị chặn và **không ghi gì vào CSDL**; sai mật khẩu; từ chối dùng access token để refresh; từ chối token rác; refresh hợp lệ đổi được cặp token mới |

Chạy: `./gradlew :app:test` → **16/16 PASS**.

## 4. Đã chạy thật để kiểm chứng

Dựng MariaDB 10.4.32 (đúng bản trong XAMPP), nạp `database/medsched_db.sql`, khởi
động ứng dụng và gọi API thật:

| Kiểm tra | Kết quả |
|:---|:---|
| Hibernate `ddl-auto: validate` | PASS — 17 Entity khớp tuyệt đối với schema |
| Đăng nhập `admin@medsched.vn` | Thành công, trả về `expiresIn: 3600` |
| Quyền trả về | `ROLE_PATIENT`, `ROLE_ADMIN`, `ROLE_ADMIN@<chi-nhánh>` |
| `GET /api/v1/me` (có token) | 200, đúng email và trạng thái tài khoản |
| `GET /api/v1/me` (không token) | 401 |
| Bệnh nhân gọi `GET /api/v1/admin/users` | **403** (chặn đúng) |
| Tiếng Việt có dấu | Đúng: `Quản Trị Viên Hệ Thống` |

## 5. Cách chạy lại

```bash
# 1. Bật MySQL trong XAMPP Control Panel
# 2. Nạp CSDL: phpMyAdmin -> Import -> Source_code/database/medsched_db.sql
# 3. Chạy backend
cd Source_code/backend
./gradlew :app:bootRun

# Chạy test
./gradlew :app:test
```

Tài khoản mẫu (mật khẩu chung `Medsched@123`): `admin@medsched.vn`,
`dr.minhanh@medsched.vn`, `letan.q1@medsched.vn`, `benhnhan.demo@gmail.com`.

## 6. Lưu ý cho cả nhóm

1. **Không để dấu tiếng Việt trong đường dẫn thư mục dự án.** Máy đang để ở
   `D:\javaspring 2 đồ án\...` khiến `gradlew.bat` báo `Unable to access jarfile`
   và test báo `ClassNotFoundException`, do JVM trên Windows đọc sai đường dẫn có
   dấu. Đổi thành ví dụ `D:\javaspring2\` là hết lỗi.
2. **Từ nay schema chỉ sửa trong `database/medsched_db.sql`.** Vì đã chuyển sang
   `ddl-auto: validate`, nếu ai thêm trường vào Entity mà quên sửa file SQL thì
   ứng dụng sẽ báo lỗi ngay lúc khởi động — đó là chủ ý, để phát hiện sớm.

## 7. Việc còn lại (giai đoạn sau)

* Refresh token hiện là JWT không lưu CSDL nên chưa thu hồi được từng token;
  nếu cần thì thêm bảng `refresh_tokens`.
* Chưa giới hạn số lần đăng nhập sai (rate limit).
* Chưa có quên mật khẩu / xác minh email.
