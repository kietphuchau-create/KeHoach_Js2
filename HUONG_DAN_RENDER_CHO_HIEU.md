# 📋 HƯỚNG DẪN CẤU HÌNH & DEPLOY BACKEND RENDER (GỬI HIẾU)

> **Người thực hiện:** Nguyễn Văn Hiếu (`@NguyenVanHieu-07-dev` - Phụ trách DevOps / Render)  
> **Người gửi / Phối hợp:** Châu Tuấn Kiệt (`@kietphuchau-create`)  
> **Dự án:** MedSched Pro (Hệ thống đặt lịch & hồ sơ y tế thông minh)  
> **Thời gian:** 05/11/2026  
> **Mục tiêu:** Cập nhật Backend Spring Boot trên Render để kích hoạt 2 tính năng chuẩn đặc tả SRS Chương 5:
> 1. **`REQ-NOTI-02`**: Cron Job tự động gửi email nhắc lịch khám trước 24h (chạy lúc 08:00 sáng).
> 2. **`REQ-FILE-01`**: Tải ảnh đại diện bác sĩ / tài liệu y tế lên dịch vụ đám mây **Cloudinary CDN**.

---

## 📌 Bối cảnh công việc
- Đội ngũ đã hoàn thiện mã nguồn Backend & Frontend cho 2 tính năng mới và vượt qua toàn bộ **162/162 bài kiểm thử tự động (Unit & Integration Tests 100% PASS)**.
- Frontend đã tích hợp nút camera tải ảnh đại diện tại trang `Hồ sơ cá nhân` (`/profile`).
- Toàn bộ thay đổi đã được đóng gói trong **Pull Request #64**:  
  🔗 **Link PR #64:** [https://github.com/kietphuchau-create/KeHoach_Js2/pull/64](https://github.com/kietphuchau-create/KeHoach_Js2/pull/64)
- **Lý do cần Hiếu hỗ trợ:** Backend trên Render hiện tại đang chạy bản build cũ và chưa có các biến môi trường kết nối Cloudinary, dẫn đến Frontend gọi API upload bị báo lỗi `404 Not Found`.

---

## ✅ Checklist 4 bước cụ thể Hiếu cần làm trên Render

### Bước 1: Thêm 3 biến môi trường Cloudinary vào Render
1. Truy cập vào trang quản trị: **[Render Dashboard](https://dashboard.render.com)**.
2. Chọn Web Service Backend của dự án: **`medsched-zu15`** (hoặc service tương ứng).
3. Ở menu bên trái, bấm vào mục **Environment** (hoặc **Environment Variables**).
4. Nhấn **Add Environment Variable** và thêm chính xác 3 biến sau:

| Tên biến (Key) | Giá trị (Value) | Giải thích |
|:---|:---|:---|
| `CLOUDINARY_CLOUD_NAME` | `fjbp6est` | Tên Cloud lưu trữ media của nhóm |
| `CLOUDINARY_API_KEY` | `967591294646936` | Khóa API định danh dịch vụ |
| `CLOUDINARY_API_SECRET` | `daThYN43iP92ylka7wSRHumbMYc` | Khóa bí mật kết nối Cloudinary |

> ⚠️ **Lưu ý:** Giữ nguyên các biến môi trường sẵn có (như `SPRING_DATASOURCE_*`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `JWT_SECRET`).  
> Đảm bảo `MAIL_USERNAME` và `MAIL_PASSWORD` vẫn hoạt động tốt để Cron Job 24h gửi email nhắc lịch.

5. Nhấn **Save Changes** ở cuối trang.

---

### Bước 2: Duyệt & Merge Pull Request #64 trên GitHub
1. Mở link: [https://github.com/kietphuchau-create/KeHoach_Js2/pull/64](https://github.com/kietphuchau-create/KeHoach_Js2/pull/64)
2. Kiểm tra nhánh gộp: `feature/clab-146-cron-job-reminder-and-cloudinary-upload` ➔ **`develop`**.
3. Kéo xuống cuối trang, nhấn nút xanh **"Merge pull request"**, sau đó nhấn tiếp **"Confirm merge"**.

---

### Bước 3: Kích hoạt Clear Build Cache & Deploy trên Render
Vì backend lần này có thêm thư viện mới (`cloudinary-http44:1.38.0`), cần xóa cache build cũ để Render tải dependency mới sạch sẽ:

1. Quay lại trang Web Service **`medsched-zu15`** trên Render.
2. Ở góc trên bên phải màn hình, nhấn vào nút **Manual Deploy**.
3. Chọn dòng: **"Clear build cache & deploy"**.
4. Chuyển sang tab **Logs** và theo dõi quá trình:
   - Render sẽ checkout code mới nhất từ nhánh `develop`.
   - Chạy Gradle build: `./gradlew bootJar`.
   - Khởi chạy Spring Boot thành công:  
     `Started MedSchedApplication in ... seconds`
   - Đèn trạng thái chuyển sang màu xanh lá: 🟢 **Live**.

---

### Bước 4: Kiểm tra & Nghiệm thu cùng Kiệt
Sau khi service báo 🟢 **Live**:

1. **Test tính năng Tải ảnh Cloudinary:**
   - Mở giao diện Web trên Vercel: `https://medsched-lyart.vercel.app/profile` (hoặc link preview của nhánh).
   - Đăng nhập tài khoản Bác sĩ (ví dụ: `ghdft@gmail.com`).
   - Bấm vào biểu tượng **Camera 📷** ở vòng tròn ảnh đại diện -> Chọn 1 file ảnh (JPG/PNG < 5MB).
   - Kiểm tra ảnh hiển thị ngay lập tức và link ảnh có định dạng CDN Cloudinary: `https://res.cloudinary.com/fjbp6est/...`.

2. **Test Endpoint API upload:**
   - Endpoint: `POST https://medsched-zu15.onrender.com/api/files/upload` (Form-data: `file=@avatar.png`).
   - Phản hồi mong đợi: HTTP `200 OK` kèm JSON:
     ```json
     {
       "url": "https://res.cloudinary.com/fjbp6est/image/upload/v.../medsched/avatars/....jpg",
       "publicId": "medsched/avatars/...",
       "format": "jpg",
       "size": 12345,
       "originalFilename": "avatar.png"
     }
     ```

3. **Kiểm tra tác vụ Cron Job nhắc lịch:**
   - Backend sẽ tự động kích hoạt tác vụ `@Scheduled` vào đúng **08:00:00 sáng hàng ngày** để gửi email nhắc hẹn cho các bệnh nhân có lịch khám vào ngày hôm sau kèm tag `[REMINDER-24H-SENT]`.

---

> 💬 **Xong bước nào hoặc gặp trục trặc gì trong lúc deploy, Hiếu nhắn ngay cho Kiệt qua Zalo/Nhóm chat để phối hợp fix ngay nhé! Cảm ơn Hiếu nhiều!**
