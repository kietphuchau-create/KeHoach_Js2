# 🚀 HƯỚNG DẪN TRIỂN KHAI (DEPLOY) DỰ ÁN MEDSCHED LÊN CLOUD (MIỄN PHÍ 0Đ)

Tài liệu hướng dẫn từng bước cầm tay chỉ việc để đưa toàn bộ hệ thống **MedSched** (Database + Backend Spring Boot + Frontend Next.js) lên Internet, phục vụ chấm điểm và demo trước hội đồng mà không cần mang máy tính cá nhân.

---

## 📌 KIẾN TRÚC TRIỂN KHAI TỔNG THỂ

```
┌────────────────────────────────┐
│   GIẢNG VIÊN / HỘI ĐỒNG CHẤM   │
└───────────────┬────────────────┘
                ▼ (Truy cập qua trình duyệt Web)
┌────────────────────────────────┐
│         VERCEL (0đ)            │  🌐 Domain: https://medsched-frontend.vercel.app
│      (Frontend Next.js 15)     │  ⚡ CDN toàn cầu, auto HTTPS
└───────────────┬────────────────┘
                │ Gọi API qua REST (NEXT_PUBLIC_API_URL)
                ▼
┌────────────────────────────────┐
│         RENDER (0đ)            │  🌐 Domain: https://medsched-api.onrender.com
│     (Backend Spring Boot 3)    │  ⚙️ Chạy file .jar (Java 21)
└───────────────┬────────────────┘
                │ Kết nối JDBC (SSL)
                ▼
┌────────────────────────────────┐
│     AIVEN FOR MYSQL (0đ)       │  🗄️ mysql-xxx.aivencloud.com:xxxxx
│       (Cloud Database)         │  💾 1GB RAM / 1GB Disk (Free vĩnh viễn)
└────────────────────────────────┘
```

* **Nhánh Git sử dụng xuyên suốt:** **`develop`** (nhánh trung tâm tích hợp đầy đủ nhất của cả nhóm).

---

## 🗄️ BƯỚC 1: TẠO DATABASE TRÊN MÂY (AIVEN FOR MYSQL)

Thay thế cho MySQL trong XAMPP (chỉ chạy local trên máy cá nhân).

### 1.1. Đăng ký & Tạo Service MySQL
1. Truy cập: [https://aiven.io](https://aiven.io/)
2. Bấm **Sign up with GitHub** (dùng chung tài khoản GitHub cho tiện).
3. Bấm nút **Create service**.
4. Thiết lập các thông số:
   * **Service:** Chọn **MySQL**.
   * **Cloud provider & region:** Chọn **AWS** hoặc **Google Cloud**, chọn vị trí **Singapore** (hoặc khu vực gần Việt Nam nhất để có độ trễ thấp).
   * **Service plan:** Chọn gói **Free** (Miễn phí 100%).
   * **Service name:** Đặt tên `medsched-db`.
5. Bấm **Create free service**. Đợi khoảng 2 - 3 phút để hệ thống khởi tạo.

### 1.2. Lấy thông tin kết nối
Khi Service chuyển sang trạng thái **Running**, ở tab **Overview**, bạn sẽ thấy các thông tin:
* **Host:** `mysql-xxxx.aivencloud.com`
* **Port:** `12345` (ví dụ)
* **User:** `avnadmin`
* **Password:** *(Bấm nút Copy để lấy mật khẩu)*
* **Database Name:** `defaultdb`

### 1.3. Import CSDL (Schema & Dữ Liệu)
Mở phần mềm quản lý CSDL trên máy của bạn (**DBeaver**, **HeidiSQL**, **Navicat** hoặc **MySQL Workbench**):
1. Tạo một kết nối mới (New Connection) loại **MySQL**.
2. Điền các thông số Host, Port, User, Password từ Aiven ở trên.
3. Bật **SSL/TLS** (Aiven yêu cầu kết nối có mã hóa SSL).
4. Kết nối thành công ➔ Mở file SQL của nhóm:
   * Đường dẫn: [`Source_code/database/medsched_db.sql`](Source_code/database/medsched_db.sql)
5. Chạy toàn bộ file SQL (Execute Script) vào database `defaultdb`. Toàn bộ các bảng và dữ liệu tài khoản mẫu sẽ được nạp lên cloud!

---

## ⚙️ BƯỚC 2: DEPLOY BACKEND LÊN RENDER (SPRING BOOT 3)

### 2.1. Tạo Web Service trên Render
1. Truy cập: [https://render.com](https://render.com/) ➔ Đăng nhập bằng **GitHub**.
2. Ở Dashboard, bấm nút **New +** ở góc trên bên phải ➔ Chọn **Web Service**.
3. Chọn Repository **`KeHoach_Js2`**. *(Nếu chưa thấy repo, bấm "Configure account" để cấp quyền cho Render truy cập repo)*.

### 2.2. Điền thông tin cấu hình
* **Name:** `medsched-api`
* **Region:** `Singapore`
* **Branch:** **`develop`** *(Bắt buộc chọn `develop`)*
* **Root Directory:** `Source_code/backend`
* **Language (Runtime):** Chọn **`Docker`** *(Render chạy Spring Boot 3 qua Dockerfile tự động cực chuẩn)*
* **Instance Type:** Chọn **Free** ($0 / month, 0.1 CPU, 512 MB RAM).

### 2.3. Khai báo Biến Môi Trường (Environment Variables)
Kéo xuống mục **Environment Variables**, bấm **Add Environment Variable** để thêm từng dòng sau:

| Tên biến (Key) | Giá trị (Value) | Giải thích |
|---|---|---|
| `JAVA_VERSION` | `21` | Dùng JDK 21 chuẩn |
| `DB_URL` | `jdbc:mysql://medsched-db-medsched-10102026.f.aivencloud.com:19144/defaultdb?useSSL=true&requireSSL=false&serverTimezone=Asia/Ho_Chi_Minh` | Kết nối Aiven Cloud MySQL |
| `DB_USER` | `avnadmin` | User của Aiven |
| `DB_PASSWORD` | `<MAT_KHAU_AIVEN_CUA_BAN>` | Mật khẩu Aiven bạn nhận được ở Bước 1 |
| `JWT_SECRET` | `404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970` | Khóa bí mật JWT |

4. Bấm nút **Create Web Service**.
5. Render sẽ bắt đầu clone code từ nhánh `develop`, chạy Gradle build và khởi động Spring Boot.
   * Quá trình build lần đầu mất khoảng 3 - 5 phút.
   * Khi thấy dòng log `Started MedSchedApplication in ... seconds` và trạng thái hiện **Live** màu xanh là Backend đã online!
6. **Lấy URL Backend:** Render sẽ cấp cho bạn 1 đường link ở ngay đầu trang:
   👉 *Ví dụ: `https://medsched-api.onrender.com`*

---

## 🌐 BƯỚC 3: DEPLOY FRONTEND LÊN VERCEL (NEXT.JS 15)

### 3.1. Tạo Project trên Vercel
1. Truy cập: [https://vercel.com](https://vercel.com/) ➔ Đăng nhập bằng tài khoản **GitHub**.
2. Ở Dashboard, bấm nút **Add New...** ➔ Chọn **Project**.
3. Tìm và bấm **Import** tại repo **`KeHoach_Js2`**.

### 3.2. Cấu hình Project
1. **Project Name:** `medsched-frontend`
2. **Framework Preset:** Vercel tự nhận diện là **Next.js**.
3. **Root Directory:** Bấm nút **Edit** ➔ Chọn thư mục **`Source_code/frontend`** ➔ Bấm **Continue**.
4. Mục **Build and Output Settings:** Giữ nguyên mặc định.

### 3.3. Cấu hình Biến Môi Trường (Environment Variables)
Mở mục **Environment Variables** và thêm biến quan trọng sau:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://medsched-api.onrender.com/api/v1` |

*(Lưu ý: Thay `https://medsched-api.onrender.com` bằng URL Backend Render thực tế bạn nhận được ở Bước 2, nhớ thêm đuôi `/api/v1`)*.

### 3.4. Triển khai
* Bấm nút **Deploy**.
* Vercel sẽ tự động tải các thư viện pnpm, build Next.js tĩnh và tối ưu hóa tài nguyên.
* Quá trình mất khoảng 1 - 2 phút. Sau khi xong, màn hình chúc mừng hiện ra kèm đường link chính thức:
  👉 *Ví dụ: `https://medsched-frontend.vercel.app`*

---

## 🛡️ BƯỚC 4: GIỮ BACKEND LUÔN THỨC (UPTIMEROBOT - TÙY CHỌN NHƯNG NÊN LÀM)

> **Lưu ý:** Gói Free của Render sẽ tự động chuyển sang chế độ ngủ (sleep) nếu sau 15 phút không có lượt truy cập. Khi có người mở web, server sẽ mất khoảng 40 - 50 giây để khởi động lại.
> **Cách khắc phục:** Dùng công cụ Ping miễn phí UptimeRobot để giữ server luôn luôn tỉnh táo 24/7.

1. Truy cập: [https://uptimerobot.com](https://uptimerobot.com/) ➔ Đăng ký tài khoản miễn phí.
2. Bấm **Add New Monitor**.
3. Thiết lập:
   * **Monitor Type:** Chọn `HTTP(s)`.
   * **Friendly Name:** `Ping MedSched Backend`.
   * **URL (or IP):** Điền `https://medsched-api.onrender.com/api/v1/auth/login` (URL API login của Render).
   * **Monitoring Interval:** Chọn `5 minutes` (cứ 5 phút ping 1 lần).
4. Bấm **Create Monitor**. Từ giờ server của bạn sẽ luôn thức và phản hồi siêu nhanh khi thầy click link!

---

## ✅ DANH SÁCH KIỂM TRA (CHECKLIST) SAU KHI DEPLOY XONG

Sau khi hoàn tất cả 3 bước, bạn mở trình duyệt và kiểm tra lần lượt:

- [ ] **Mở trang chủ:** Giao diện hiển thị sắc nét, banner chạy mượt mà, không bị lỗi font hay vỡ hình.
- [ ] **Đăng nhập Bác sĩ:** Thử tài khoản bác sĩ (ví dụ: `doctor1@medsched.vn` / `Doctor@123`) ➔ Vào buồng khám xem danh sách ca trực.
- [ ] **Đăng nhập Quản trị viên (Admin):** Thử tài khoản Admin (`admin@medsched.vn` / `Admin@123`) ➔ Vào trang quản lý danh mục và xem biểu đồ thống kê.
- [ ] **Bệnh nhân đặt khám:** Vào `/booking`, chọn bác sĩ, khung giờ và quét mã QR VietQR (2.000đ).
- [ ] **Kiosk tự Check-in:** Mở `/checkin`, quét mã hoặc nhập mã vé hẹn để kiểm tra ca khám được tiếp đón tức thì.
- [ ] **Gửi link cho thầy:** Copy link `https://medsched-frontend.vercel.app` gửi cho giảng viên nghiệm thu!
