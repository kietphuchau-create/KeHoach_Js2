# 📋 NHIỆM VỤ DEPLOY & CẤU HÌNH BACKEND RENDER (GỬI HIẾU)

> **Người thực hiện:** Nguyễn Văn Hiếu (`@NguyenVanHieu-07-dev`)  
> **Người giao / phối hợp:** Châu Tuấn Kiệt (`@kietphuchau-create`)  
> **Trạng thái:** Chờ thực hiện  
> **Mục tiêu:** Cập nhật bản build Backend Spring Boot mới nhất từ nhánh `develop` lên Render, cấu hình gửi Mail OTP qua Google Gmail, và đồng bộ URL cho Frontend trên Vercel.

---

## 📌 Bối cảnh công việc
- Tính năng **Xác thực mã OTP 4 chữ số qua Gmail thật (100% miễn phí)** đã được hoàn tất và đã gộp (Merged) vào nhánh chính **`develop`** qua **Pull Request #10**.
- Frontend trên Vercel đã hoàn thành giao diện đăng ký & xác thực qua Email kèm cơ chế tự ngắt Timeout 15s.
- Cần Hiếu kích hoạt kéo code mới trên Render và thêm cấu hình tài khoản gửi Mail để toàn bộ luồng đăng ký chạy thông suốt trên đám mây.

---

## ✅ Danh sách nhiệm vụ cần làm (Checklist)

### 1. Lấy URL Backend chính xác của nhóm trên Render
- [ ] Truy cập [Dashboard Render](https://dashboard.render.com).
- [ ] Mở Web Service Backend của MedSched.
- [ ] Sao chép đường link chính thức của service (dạng `https://<service-name>.onrender.com`) và gửi lại cho Kiệt để kiểm tra / cập nhật biến môi trường trên Vercel.

---

### 2. Thêm biến môi trường gửi Mail (Gmail SMTP)
- [ ] Tại Web Service backend trên Render, bấm vào mục **Environment** (hoặc **Environment Variables**).
- [ ] Nhấn **Add Environment Variable** và thêm 2 biến sau:

| Tên biến (Key) | Giá trị (Value) | Ghi chú |
|:---|:---|:---|
| `MAIL_USERNAME` | `<email-gửi-otp>` | Tài khoản Gmail gửi OTP; cấu hình trực tiếp trên Render, không commit vào Git |
| `MAIL_PASSWORD` | `<app-password-mới>` | App Password phải được lưu trong secret manager của Render |

> App Password từng xuất hiện trong Git phải được thu hồi và tạo lại trước khi triển khai.

- [ ] Nhấn **Save Changes** để lưu cấu hình.

---

### 3. Kích hoạt Build lại Backend từ nhánh `develop`
- [ ] Nhấn vào nút **Manual Deploy** ở góc trên bên phải màn hình quản trị của service.
- [ ] Chọn dòng **Clear build cache & deploy** *(khuyến nghị chọn dòng này để Render tải thư viện `spring-boot-starter-mail` sạch sẽ, không bị cache cũ)*.
- [ ] Theo dõi tab **Logs** cho đến khi thấy:
  - Gradle build thành công `:app:bootJar`.
  - Spring Boot khởi động: `Started MedSchedApplication in ... seconds`.
  - Trạng thái Web Service chuyển sang màu xanh lá: 🟢 **Live**.

---

### 4. Báo lại kết quả & nghiệm thu
- [ ] Nhắn tin xác nhận cho Kiệt qua Zalo sau khi Service đã **Live**.
- [ ] Cùng Kiệt test tính năng tạo tài khoản trên web Vercel: nhập email ➔ nhận mã 4 số trong hộp thư Gmail ➔ xác thực thành công.
