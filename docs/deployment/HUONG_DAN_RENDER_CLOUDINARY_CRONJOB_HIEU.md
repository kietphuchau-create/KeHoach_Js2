# 📋 HƯỚNG DẪN CẤU HÌNH RENDER CHO HIẾU (CHUYÊN TRÁCH RENDER)

> **Phân công trách nhiệm:**
> - **Nguyễn Văn Hiếu (`@NguyenVanHieu-07-dev`):** Chuyên trách cấu hình môi trường & triển khai Web Service Backend trên **Render**.
> - **Châu Tuấn Kiệt (`@kietphuchau-create`):** Phụ trách Git/GitHub (Review & Merge PR #64), Frontend Vercel và kiểm thử nghiệm thu toàn hệ thống.
> 
> **Mục tiêu:** Cung cấp thông tin xác thực Cloudinary trên Render để Backend kích hoạt 2 tính năng:
> 1. `REQ-NOTI-02`: Cron Job tự động gửi email nhắc lịch khám trước 24h lúc 08:00 sáng.
> 2. `REQ-FILE-01`: Upload ảnh đại diện / tài liệu y tế qua Cloudinary CDN.

---

## 🎯 VIỆC DUY NHẤT HIẾU CẦN THỰC HIỆN TRÊN RENDER

Hiếu chỉ cần thao tác 2 bước trực tiếp trên Render Dashboard (phần Git PR và Vercel Kiệt sẽ tự xử lý):

### Bước 1: Thêm 3 biến môi trường Cloudinary
1. Đăng nhập vào: **[Render Dashboard](https://dashboard.render.com)**.
2. Chọn Web Service Backend: **`medsched-zu15`**.
3. Bấm vào mục **Environment** ở cột bên trái.
4. Bấm **Add Environment Variable** và thêm 3 biến sau:

| Tên biến (Key) | Giá trị (Value) | Ghi chú |
|:---|:---|:---|
| `CLOUDINARY_CLOUD_NAME` | `fjbp6est` | Tên cloud lưu trữ media |
| `CLOUDINARY_API_KEY` | `967591294646936` | Khóa API Cloudinary |
| `CLOUDINARY_API_SECRET` | `daThYN43iP92ylka7wSRHumbMYc` | Khóa bí mật Cloudinary |

> ⚠️ **Lưu ý:** Vẫn giữ nguyên các biến cũ (`SPRING_DATASOURCE_*`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `JWT_SECRET`).  
> Đảm bảo `MAIL_USERNAME` và `MAIL_PASSWORD` không bị xóa để tác vụ Cron Job 24h gửi email nhắc lịch hoạt động bình thường.

5. Nhấn **Save Changes**.

---

### Bước 2: Kích hoạt Deploy lại Service
Sau khi Kiệt báo đã Merge PR #64 vào `develop` (hoặc để Render nhận biến môi trường mới và thư viện mới):

1. Tại trang service **`medsched-zu15`**, bấm vào nút **Manual Deploy** (góc trên bên phải).
2. Chọn: **"Clear build cache & deploy"** *(xóa cache cũ để Render tải gói `cloudinary-http44` mới)*.
3. Chờ trạng thái báo 🟢 **Live** là hoàn tất nhiệm vụ!

---

> 💬 Sau khi bấm deploy và thấy service báo 🟢 **Live**, Hiếu nhắn Kiệt một tiếng để Kiệt tự test nghiệm thu trên Vercel nhé. Cảm ơn Hiếu!
