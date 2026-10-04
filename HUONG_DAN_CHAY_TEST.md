# Hướng Dẫn Chạy Test Tự Động Toàn Diện Hệ Thống MedSched

Tài liệu này hướng dẫn cách chạy kịch bản kiểm thử tự động (Automated Test Suite) bao gồm đầy đủ **4 nhóm chức năng cốt lõi**:
1. **Khám bệnh, Đặt lịch & Tiếp đón** (Đặt lịch, Check-in QR/CCCD, Khám bệnh, Kê đơn thuốc, Thu tiền viện phí)
2. **Hồ sơ & Thông tin tài khoản** (Xem info cá nhân, Sửa thông tin, Hồ sơ y tế, Hồ sơ bác sĩ, Đổi mật khẩu)
3. **Thông tin Bác sĩ / Phòng khám & Danh mục** (Cơ sở y tế, Chuyên khoa, Dịch vụ & Bảng giá, Danh sách Bác sĩ)
4. **Quản lý người dùng** (Lọc vai trò, Xem chi tiết, Tạo Lễ tân, Tạo Bác sĩ, Khóa/Mở tài khoản, Phân quyền)

---

## 1. Các File Test Được Cung Cấp Sẵn

Trong thư mục gốc của dự án có sẵn 2 script test tự động:
* `test_suite.ps1`: Script PowerShell chạy trực tiếp trên Windows PowerShell.
* `test_suite.js`: Script Node.js chạy đa nền tảng (Windows, macOS, Linux).

---

## 2. Cách Chạy Test Tự Động (1 Lệnh Duy Nhất)

### Bước 1: Khởi động Backend Spring Boot
Đảm bảo backend MedSched đang chạy ở cổng `8080`:
```bash
cd Source_code/backend
./gradlew bootRun
```

### Bước 2: Chạy File Test Tự Động

* **Cách 1: Chạy bằng PowerShell (Khuyên dùng trên Windows):**
```powershell
.\test_suite.ps1
```
*(Nếu đổi cổng hoặc IP backend, có thể truyền tham số: `.\test_suite.ps1 -BaseUrl "http://localhost:8080"`)*

* **Cách 2: Chạy bằng Node.js:**
```bash
node test_suite.js
```
*(Hoặc: `node test_suite.js http://localhost:8080`)*

---

## 3. Danh Sách Các Mục Kiểm Thử Chi Tiết

### 🧑‍💼 Mục 1: Quản lý người dùng (Admin User Management)
| Mã test | Kịch bản kiểm thử | API tương ứng |
| :--- | :--- | :--- |
| **1.1** | Lấy danh sách toàn bộ người dùng phân trang | `GET /api/v1/admin/users?page=0&size=10` |
| **1.2** | Lọc danh sách người dùng theo vai trò Bác sĩ (`ROLE_DOCTOR`) | `GET /api/v1/admin/users?role=ROLE_DOCTOR` |
| **1.3** | Tạo mới tài khoản Lễ tân tại cơ sở y tế | `POST /api/v1/admin/users/staff` |
| **1.4** | Tạo mới tài khoản Bác sĩ (Kèm chuyên khoa, học vị, phòng khám, giá khám) | `POST /api/v1/admin/users/doctors` |
| **1.5** | Khóa tài khoản nhân sự (`active: false`) | `PATCH /api/v1/admin/users/{userId}/status` |
| **1.6** | Mở khóa lại tài khoản nhân sự (`active: true`) | `PATCH /api/v1/admin/users/{userId}/status` |

---

### 👤 Mục 2: Hồ sơ & Thông tin tài khoản (Profile & Account Info)
| Mã test | Kịch bản kiểm thử | API tương ứng |
| :--- | :--- | :--- |
| **2.1** | Đăng nhập & xem thông tin hồ sơ tài khoản hiện tại | `GET /api/v1/me` |
| **2.2** | Cập nhật Họ tên và Số điện thoại cá nhân | `PUT /api/v1/me` |
| **2.3** | Cập nhật hồ sơ y tế bệnh nhân (CCCD, BHYT, Giới tính, Địa chỉ, Tiền sử bệnh) | `PUT /api/v1/me/patient-profile` |
| **2.4** | Bác sĩ cập nhật hồ sơ chuyên môn (Học vị, Năm kinh nghiệm, Tiểu sử, Avatar) | `PUT /api/v1/me/doctor-profile` |

---

### 🏥 Mục 3: Thông tin Bác sĩ / Phòng khám & Danh mục (Catalog & Clinic Info)
| Mã test | Kịch bản kiểm thử | API tương ứng |
| :--- | :--- | :--- |
| **3.1** | Lấy danh sách Cơ sở y tế / Phòng khám hoạt động | `GET /api/v1/medical-centers` |
| **3.2** | Lấy danh sách các Chuyên khoa khám chữa bệnh | `GET /api/v1/specialties` |
| **3.3** | Lấy danh mục Dịch vụ khám và Bảng giá công khai | `GET /api/v1/services` |
| **3.4** | Lấy danh sách Bác sĩ theo chuyên khoa & cơ sở y tế | `GET /api/v1/doctors` |

---

### 🩺 Mục 4: Khám bệnh, Đặt lịch & Tiếp đón (Appointments, Queue, Prescription & Billing)
| Mã test | Kịch bản kiểm thử | API tương ứng |
| :--- | :--- | :--- |
| **4.1** | Tra cứu các khung giờ khám còn trống (Slots) của Bác sĩ trong ngày | `GET /api/appointments/doctors/{doctorId}/slots` |
| **4.2** | Bệnh nhân đặt lịch khám trực tuyến với bác sĩ | `POST /api/appointments` |
| **4.3** | Bệnh nhân tra cứu danh sách các ca khám và lịch hẹn đã đặt | `GET /api/appointments/patient/{patientProfileId}` |
| **4.4** | Quầy Lễ tân check-in tiếp đón bệnh nhân bằng Mã đặt chỗ / Mã QR vé hẹn | `POST /api/reception/checkin/qr` |
| **4.5** | Quầy Lễ tân tiếp nhận bệnh nhân vãng lai không đặt trước (Cấp STT & Phòng) | `POST /api/reception/walkin` |
| **4.6** | Bác sĩ theo dõi danh sách hàng đợi bệnh nhân chờ khám theo thời gian thực | `GET /api/doctor/queue` |
| **4.7** | Bác sĩ gọi bệnh nhân vào phòng khám (`IN_PROGRESS`) | `POST /api/doctor/appointments/{id}/call` |
| **4.8** | Bác sĩ hoàn tất khám bệnh, kết luận chẩn đoán và kê đơn thuốc điện tử | `POST /api/doctor/appointments/{id}/prescriptions` |
| **4.9** | Quầy Lễ tân xuất bảng kê chi phí và hóa đơn thanh toán viện phí | `GET /api/reception/appointments/{id}/bill` |
| **4.10** | Quầy Lễ tân xác nhận thu tiền viện phí & xuất biên lai thanh toán | `POST /api/reception/invoices/{invoiceId}/pay` |

---

## 4. Kiểm Thử Trực Quan Trên Trình Duyệt Web (Frontend)

Bạn có thể mở trình duyệt và truy cập các trang giao diện tương ứng:

* 🌐 **Trang chủ / Đặt lịch khám:** `http://localhost:3000/booking`
* 👤 **Hồ sơ cá nhân & Đổi mật khẩu:** `http://localhost:3000/profile`
* 📋 **Lịch hẹn của tôi:** `http://localhost:3000/my-appointments`
* 🏢 **Quầy tiếp đón & Check-in QR/CCCD:** `http://localhost:3000/reception`
* 🩺 **Phòng khám Bác sĩ (Hàng đợi & Kê đơn):** `http://localhost:3000/doctor`
* ⚙️ **Quản lý người dùng & Phân quyền (Admin):** `http://localhost:3000/admin`
* 📚 **Quản lý Danh mục (Cơ sở, Chuyên khoa, Dịch vụ):** `http://localhost:3000/admin/catalog`
