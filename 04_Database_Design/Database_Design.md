# 🗄️ 04. Thiết Kế Cơ Sở Dữ Liệu (Database Design) - Dự Án MedSched

> **Học phần:** Java Spring 2 - Phát triển ứng dụng Web thông minh với Spring Boot & AI  
> **Hệ quản trị CSDL:** PostgreSQL 16 (chạy trên Docker container, Port `5433`)  
> **File kịch bản SQL:** [`medsched_schema.sql`](./medsched_schema.sql)

---

## 1. Danh Sách 9 Bảng Thực Thể (Entity Tables)

Hệ thống được chuẩn hóa theo dạng chuẩn 3NF gồm **10 bảng** chặt chẽ, tối ưu hóa cho hiệu năng truy vấn và bảo toàn toàn vẹn dữ liệu y tế:

```
                      ┌───────────────┐
                      │     users     │
                      └───────┬───────┘
                     1        │ 1
             ┌────────────────┴────────────────┐
             ▼                                 ▼
      ┌─────────────┐                   ┌─────────────┐
      │  patients   │                   │   doctors   │
      └──────┬──────┘                   └──────┬──────┘
             │ 1                               │ 1
             │       ┌───────────────┐         │
             │       │  specialties  │◄────────┤
             │       └───────────────┘         │
             │                                 │ 1
             │                                 ▼
             │                      ┌─────────────────────┐
             │                      │  doctor_schedules   │
             │                      └──────────┬──────────┘
             │                                 │ 1
             │                                 ▼
             │                      ┌─────────────────────┐
             │                      │     time_slots      │
             │                      └──────────┬──────────┘
             │ 1                               │ 1 (One-to-One)
             └───────────────┐   ┌─────────────┘
                             ▼   ▼
                      ┌───────────────┐
                      │ appointments  │
                      └───────┬───────┘
            ┌─────────────────┼─────────────────┐
           1│                1│                1│
            ▼                 ▼                 ▼
     ┌────────────────┐┌─────────────────┐┌──────────────────┐
     │ symptom_images ││ medical_records ││  doctor_reviews  │
     │   (YOLO11)     ││   (Bệnh án)     ││ (Spring AI Eval) │
     └────────────────┘└─────────────────┘└──────────────────┘
```

---

## 2. Chi Tiết Cấu Trúc Các Bảng

### 2.1. Bảng `users` (Tài khoản người dùng)
- **Mục đích:** Quản lý thông tin xác thực đăng nhập, phân quyền RBAC và bảo mật mật khẩu băm.
- **Các trường:**
  - `id` (UUID, PK): Khóa chính ngẫu nhiên chống tấn công đoán số ID.
  - `email` (VARCHAR(100), UNIQUE, NOT NULL): Tên đăng nhập.
  - `password_hash` (VARCHAR(255), NOT NULL): Mật khẩu mã hóa BCrypt.
  - `full_name` (VARCHAR(100), NOT NULL): Họ và tên đầy đủ.
  - `phone` (VARCHAR(20)): Số điện thoại liên lạc.
  - `role` (VARCHAR(20), CHECK): Vai trò (`PATIENT`, `RECEPTIONIST`, `DOCTOR`, `ADMIN`).
  - `is_active` (BOOLEAN): Trạng thái kích hoạt.
  - `created_at` (TIMESTAMPTZ): Thời điểm tạo tài khoản.

### 2.2. Bảng `patients` (Thông tin hồ sơ bệnh nhân)
- **Mục đích:** Lưu trữ hồ sơ định danh công dân và thẻ y tế phục vụ nhận diện tự động bằng YOLO11.
- **Các trường:**
  - `id` (UUID, PK): Khóa chính.
  - `user_id` (UUID, FK ➔ `users.id`): Liên kết 1-1 với tài khoản người dùng (có thể NULL cho bệnh nhân vãng lai tiếp đón nhanh).
  - `cccd_number` (VARCHAR(20), UNIQUE): Số Căn cước công dân (Dùng đối soát nhanh khi quét camera tại quầy).
  - `health_insurance_no` (VARCHAR(20)): Mã thẻ Bảo hiểm y tế.
  - `date_of_birth` (DATE): Ngày tháng năm sinh.
  - `gender` (VARCHAR(10)): Giới tính (`MALE`, `FEMALE`, `OTHER`).
  - `address` (VARCHAR(255)): Địa chỉ thường trú.
  - `medical_history` (TEXT): Tiền sử dị ứng thuốc và bệnh mạn tính.

### 2.3. Bảng `specialties` (Danh mục Chuyên khoa y tế)
- **Mục đích:** Phân loại phòng khám phục vụ bộ gợi ý của Spring AI.
- **Các trường:**
  - `id` (UUID, PK): Khóa chính.
  - `name` (VARCHAR(100), NOT NULL): Tên chuyên khoa (Tim mạch, Da liễu, Nhi khoa, Tai Mũi Họng...).
  - `code` (VARCHAR(20), UNIQUE): Mã chuyên khoa (CARDIO, DERMA, PEDIA...).
  - `description` (TEXT): Diễn giải phạm vi khám.
  - `icon_url` (VARCHAR(255)): Biểu tượng minh họa trên giao diện.

### 2.4. Bảng `doctors` (Thông tin bác sĩ chuyên khoa)
- **Mục đích:** Lưu trữ học vị, chuyên khoa phụ trách và giá khám.
- **Các trường:**
  - `id` (UUID, PK): Khóa chính.
  - `user_id` (UUID, FK ➔ `users.id`): Liên kết với tài khoản bác sĩ.
  - `specialty_id` (UUID, FK ➔ `specialties.id`): Chuyên khoa phụ trách.
  - `title` (VARCHAR(50)): Học hàm, học vị (ThS.BS, BSCKII, PGS.TS).
  - `biography` (TEXT): Quá trình công tác và thế mạnh lâm sàng.
  - `consultation_fee` (NUMERIC(12,2)): Giá khám cơ bản.

### 2.5. Bảng `doctor_schedules` (Ca trực làm việc)
- **Mục đích:** Quản lý ngày làm việc và độ dài từng ca của bác sĩ.
- **Các trường:**
  - `id` (UUID, PK): Khóa chính.
  - `doctor_id` (UUID, FK ➔ `doctors.id`): Bác sĩ làm việc.
  - `work_date` (DATE): Ngày khám.
  - `start_time` (TIME): Giờ bắt đầu ca trực (ví dụ: 08:00:00).
  - `end_time` (TIME): Giờ kết thúc ca trực (ví dụ: 12:00:00).
  - `slot_duration_minutes` (INT): Độ dài mỗi lượt khám (mặc định 20 phút).

### 2.6. Bảng `time_slots` (Khung giờ khám chi tiết)
- **Mục đích:** Phân chia thành từng khung giờ cụ thể và quản lý trạng thái đặt chỗ.
- **Các trường:**
  - `id` (UUID, PK): Khóa chính.
  - `schedule_id` (UUID, FK ➔ `doctor_schedules.id`).
  - `doctor_id` (UUID, FK ➔ `doctors.id`).
  - `start_time` (TIME) & `end_time` (TIME): Khung giờ cụ thể (vd: 08:00 - 08:20).
  - `status` (VARCHAR(20)): Trạng thái (`AVAILABLE`, `BOOKED`, `BLOCKED`).
  - `version` (INT): Khóa lạc quan (Optimistic Locking) chống tình trạng tranh chấp đặt trùng giờ từ nhiều người dùng đồng thời.

### 2.7. Bảng `appointments` (Ca hẹn khám bệnh)
- **Mục đích:** Bảng hạt nhân lưu trữ chi tiết lượt đặt khám, mã vé QR, phương thức tiếp đón và tóm tắt AI.
- **Các trường:**
  - `id` (UUID, PK): Khóa chính.
  - `booking_code` (VARCHAR(16), UNIQUE): Mã vé đặt hẹn ngắn (dùng sinh QR Code).
  - `patient_id` (UUID, FK ➔ `patients.id`): Bệnh nhân khám.
  - `doctor_id` (UUID, FK ➔ `doctors.id`): Bác sĩ phụ trách.
  - `slot_id` (UUID, UNIQUE, FK ➔ `time_slots.id`): Ràng buộc 1 slot chỉ chứa tối đa 1 ca hẹn.
  - `patient_symptoms` (TEXT): Mô tả bệnh do người dùng nhập.
  - `ai_summary` (TEXT): **Tóm tắt ngắn 2 dòng do Spring AI tự động trích xuất**.
  - `checkin_method` (VARCHAR(30)): Phương thức check-in (`QR_CODE`, `YOLO_CARD_SCAN`, `MANUAL`).
  - `status` (VARCHAR(30)): Trạng thái ca khám (`PENDING`, `CONFIRMED`, `CHECKED_IN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
  - `check_in_time` (TIMESTAMPTZ): Thời điểm lễ tân/camera xác nhận có mặt.

### 2.8. Bảng `symptom_images` (Lưu kết quả phân tích thị giác máy tính YOLO11)
- **Mục đích:** Lưu trữ ảnh gốc bệnh nhân tải lên và kết quả vẽ bounding box nhận diện của YOLO11.
- **Các trường:**
  - `id` (UUID, PK): Khóa chính.
  - `appointment_id` (UUID, FK ➔ `appointments.id`).
  - `original_image_url` (VARCHAR(500)): Đường dẫn ảnh gốc.
  - `annotated_image_url` (VARCHAR(500)): Đường dẫn ảnh đã được YOLO11 khoanh vùng vết tổn thương.
  - `detected_class` (VARCHAR(100)): Nhãn phân loại tổn thương (eczema, urticaria, rash...).
  - `confidence_score` (NUMERIC(5,4)): Độ tin cậy dự đoán (vd: 0.8925).

### 2.9. Bảng `medical_records` (Hồ sơ bệnh án sau khám)
- **Mục đích:** Lưu trữ kết luận lâm sàng và đơn thuốc điện tử do bác sĩ kê.
- **Các trường:**
  - `id` (UUID, PK): Khóa chính.
  - `appointment_id` (UUID, UNIQUE, FK ➔ `appointments.id`): Mỗi ca hẹn sinh ra 1 hồ sơ bệnh án.
  - `diagnosis` (TEXT): Chẩn đoán xác định bệnh của bác sĩ (kèm mã ICD-10).
  - `doctor_notes` (TEXT): Lời dặn dò, hẹn ngày tái khám.
  - `prescription` (TEXT): Đơn thuốc điện tử (dạng JSON hoặc văn bản kê chi tiết).

### 2.10. Bảng `doctor_reviews` (Đánh giá chất lượng bác sĩ có xác thực & Spring AI Sentiment)
- **Mục đích:** Lưu trữ phản hồi của bệnh nhân sau khi khám xong và kết quả phân tích cảm xúc từ Spring AI.
- **Quy tắc nghiệp vụ:** Mỗi ca hẹn (`appointment_id`) chỉ được phép đánh giá đúng 1 lần (ràng buộc `UNIQUE`), chống spam và đánh giá ảo.
- **Các trường:**
  - `id` (UUID, PK): Khóa chính.
  - `appointment_id` (UUID, UNIQUE, FK ➔ `appointments.id`): Ca hẹn đã hoàn thành được đánh giá.
  - `patient_id` (UUID, FK ➔ `patients.id`): Bệnh nhân thực hiện đánh giá.
  - `doctor_id` (UUID, FK ➔ `doctors.id`): Bác sĩ được đánh giá.
  - `rating` (INT, CHECK (rating BETWEEN 1 AND 5)): Số sao từ 1 đến 5.
  - `comment` (TEXT): Nhận xét chi tiết của bệnh nhân.
  - `ai_sentiment` (VARCHAR(20), CHECK ('POSITIVE', 'NEUTRAL', 'NEGATIVE')): Nhãn cảm xúc do **Spring AI** tự động trích xuất.
  - `is_anonymous` (BOOLEAN, DEFAULT FALSE): Tùy chọn ẩn danh trên giao diện công khai.
  - `created_at` (TIMESTAMPTZ): Thời điểm gửi đánh giá.

---

## 3. Hướng Dẫn Xem ER Diagram Trên DBeaver
1. Mở DBeaver kết nối vào database `medsched_db` (Port: `5433`).
2. Mở nhánh **`Schemas`** ➔ **`public`** ➔ nhấp đúp vào **`Tables`**.
3. Chọn tab **`Diagram`** ở thanh công cụ chính giữa.
4. Nhấp chuột phải vào sơ đồ ➔ chọn **`Save diagram as ...`** để xuất ảnh PNG chất lượng cao.
