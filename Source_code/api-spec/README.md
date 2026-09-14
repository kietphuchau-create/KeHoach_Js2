# MedSched — Tài Liệu Đặc Tả Kỹ Thuật RESTful API (API Specification)

> **Tài liệu đặc tả chuẩn phục vụ kết nối Backend & Frontend**  
> Tuân thủ hướng dẫn và quy chuẩn thiết kế API của **Thầy Trương Thanh Bình** (14/09/2026).

---

## 📌 1. Mục Đích Của Bộ Tài Liệu Này
1. **Làm hợp đồng chuẩn giữa Backend (BE) và Frontend (FE):**
   - **Frontend:** Dựa vào tài liệu này để tạo dữ liệu mẫu (mock data), dựng xong toàn bộ giao diện mà không cần chờ Backend.
   - **Backend:** Code chuẩn theo đúng DTO, tham số query và mã lỗi, tránh việc AI sinh code lan man hoặc sai lệch CSDL.
2. **Quy chuẩn thiết kế API (API Design Standard):**
   - Mọi API dạng danh sách (List API) **bắt buộc** phải có: **Phân trang** (`page`, `size`), **Lọc** (`role`, `status`), **Tìm kiếm** (`q`), **Sắp xếp** (`sort`).
   - Chuẩn bảo mật: **JWT Bearer Token** trong Header `Authorization: Bearer <token>`.
   - Chuẩn xử lý lỗi: Mã HTTP Status rõ ràng (`400`, `401`, `403`, `404`, `409`) kèm body thông báo lỗi cụ thể.

---

## 📂 2. Hai Định Dạng Đặc Tả Được Cung Cấp

| File | Định dạng | Công cụ sử dụng |
| :--- | :--- | :--- |
| [`openapi.yaml`](./openapi.yaml) | **OpenAPI 3.0.3 (Swagger)** | Xem trực quan trên Swagger Editor, Swagger UI, Postman |
| [`MedSched_API_Collection.postman_collection.json`](./MedSched_API_Collection.postman_collection.json) | **Postman Collection v2.1** | Import trực tiếp vào Postman để bấm test API 1 click |

---

## 🚀 3. Hướng Dẫn Sử Dụng & Kiểm Thử

### Cách 1: Xem trực quan tài liệu OpenAPI trên Trình Duyệt Web
1. Truy cập trang web chính thức của Swagger: [https://editor.swagger.io/](https://editor.swagger.io/).
2. Trên thanh menu, chọn **File** ➔ **Import file** ➔ Chọn file [`openapi.yaml`](./openapi.yaml).
3. Toàn bộ danh mục 7 phân hệ API, bảng dữ liệu mẫu, schema request/response sẽ hiển thị đầy đủ và trực quan.

### Cách 2: Kiểm thử tự động trên Postman
1. Mở ứng dụng **Postman** trên máy tính.
2. Bấm nút **Import** (góc trên bên trái).
3. Kéo thả file [`MedSched_API_Collection.postman_collection.json`](./MedSched_API_Collection.postman_collection.json) vào Postman.
4. Chạy request `1. Authentication / Đăng Nhập (Login)`:
   - Postman sẽ tự động lưu JWT token vào biến môi trường `{{token}}`.
   - Tất cả các request sau đó (như `/me`, `/admin/users`, `/admin/users/doctors`) sẽ tự động có token mà không cần copy thủ công.

---

## 📋 4. Bảng Tổng Hợp Danh Mục API Dự Án

### Phân Hệ 1: Xác Thực & Tài Khoản (Auth & Profile)
* `POST /api/v1/auth/login`: Đăng nhập, cấp JWT Access Token & Refresh Token.
* `POST /api/v1/auth/register`: Đăng ký tài khoản Bệnh nhân mới (`CUSTOMER`).
* `GET /api/v1/me`: Lấy thông tin tài khoản hiện tại từ Token.
* `PUT /api/v1/me`: Cập nhật Họ tên, Số điện thoại cá nhân.
* `POST /api/v1/me/change-password`: Đổi mật khẩu tài khoản.
* `PUT /api/v1/me/doctor-profile`: Bác sĩ cập nhật học hàm, kinh nghiệm, phòng khám và tiểu sử.

### Phân Hệ 2: Quản Trị Hệ Thống (Admin Management)
* `GET /api/v1/admin/users`: Lấy danh sách người dùng **có phân trang (`page`, `size`), tìm kiếm (`q`), lọc vai trò (`role`) và sắp xếp (`sort`)**.
* `PATCH /api/v1/admin/users/{id}/status`: Khóa (`active: false`) hoặc Mở khóa (`active: true`) tài khoản.
* `POST /api/v1/admin/users/staff`: Cấp tài khoản cho Nhân viên Lễ tân theo Cơ sở y tế.
* `POST /api/v1/admin/users/doctors`: Cấp tài khoản cho Bác sĩ chuyên khoa kèm giá khám, số phòng.

### Phân Hệ 3: Danh Mục Dữ Liệu (Catalog)
* `GET /api/v1/medical-centers`: Danh sách bệnh viện / chi nhánh y tế.
* `GET /api/v1/specialties`: Danh sách chuyên khoa y tế (Tim mạch, Tiêu hóa, Thần kinh...).
* `GET /api/v1/services`: Bảng giá dịch vụ khám và xét nghiệm.

### Phân Hệ 4: Đặt Lịch & Tiếp Đón (Appointments & Reception)
* `POST /api/v1/appointments`: Đặt lịch khám mới (áp dụng khóa lạc quan, kiểm tra slot trống và tóm tắt AI).
* `GET /api/v1/appointments/{id}`: Tra cứu chi tiết lịch khám theo ID.
* `GET /api/v1/appointments/booking-code/{code}`: Tra cứu lịch khám bằng mã đặt chỗ (phục vụ máy quét QR).
* `POST /api/v1/appointments/check-in`: Tiếp đón siêu tốc 1 giây qua mã QR vé hẹn hoặc thẻ CCCD gắn chip (12 số).

### Phân Hệ 5: Trí Tuệ Nhân Tạo Y Tế (Spring AI)
* `POST /api/v1/ai/triage`: Đánh giá mức độ khẩn cấp, gợi ý chuyên khoa và sinh bản tóm tắt lâm sàng 2 dòng.
