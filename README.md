# 🏥 MedSched - Hệ Thống Quản Lý Đặt Lịch Khám & Tiếp Đón Bệnh Viện Thông Minh

> **Đề tài tốt nghiệp / Đồ án môn học:** Phát triển ứng dụng Web thông minh với Spring Boot & Trí tuệ nhân tạo (Developing Smart Web Apps with Spring Boot & AI)  
> **Công nghệ chủ đạo:** Spring Boot 3, Spring AI, Ultralytics YOLO11 (Computer Vision), PostgreSQL, Next.js / React.

---

## 📌 Giới Thiệu Dự Án

**MedSched** là nền tảng quản lý đặt lịch khám bệnh thông minh, số hóa quy trình tiếp đón và hỗ trợ y bác sĩ tại các cơ sở y tế hiện đại. Hệ thống giải quyết bài toán quá tải khâu xếp hàng chờ khám thông qua việc tích hợp đa mô hình AI:

1. **Spring AI:** 
   - Chatbot tự động tư vấn triệu chứng bằng ngôn ngữ tự nhiên.
   - Gợi ý chuyên khoa phù hợp dựa trên mô tả lâm sàng của bệnh nhân.
   - Tự động trích xuất tóm tắt triệu chứng ngắn gọn (2 dòng) giúp bác sĩ nắm bắt bệnh án tức thì.
2. **YOLO11 (Computer Vision):**
   - **Check-in tự động tại quầy lễ tân:** Quét nhận diện căn cước công dân (CCCD) và thẻ bảo hiểm y tế (BHYT) kèm OCR bóc tách thông tin chỉ trong 3 giây.
   - **Tiền sàng lọc hình ảnh lâm sàng:** Nhận diện và khoanh vùng các tổn thương ngoài da (mẩn ngứa, phát ban, viêm da...) khi bệnh nhân tải ảnh triệu chứng lên hệ thống, tự động điều hướng sang chuyên khoa Da liễu / Ngoại khoa.

---

## 🏗️ Kiến Trúc Hệ Thống (System Architecture)

```
[ Bệnh Nhân / Lễ Tân / Bác Sĩ ]
               │
               ▼
[ Web Frontend (Next.js / React) ]
               │ (REST API / JWT Auth)
               ▼
[ API Gateway & Backend (Spring Boot 3) ]
       ├── Spring Security (RBAC: Patient, Receptionist, Doctor, Admin)
       ├── Spring AI Module (Chatbot, Medical Summarization, Triage)
       └── Business Logic Services (Booking, Check-in, Scheduling)
          │                                      │
   (HTTP / gRPC)                          (PostgreSQL 16)
          ▼                                      ▼
[ YOLO11 Vision Service ]                 [ medsched_db ]
  - CCCD / BHYT OCR Check-in                - 9 Tables (Users, Appointments,
  - Skin Lesion Detection                     Doctors, Schedules, TimeSlots,
                                              Images, MedicalRecords...)
```

---

## 📁 Danh Mục Tài Liệu Trong Thư Mục

| Tên File | Loại | Mô Tả Chi Tiết |
|---|---|---|
| 📄 [`De_Xuat_Du_An_MedSched_Nhom.md`](./De_Xuat_Du_An_MedSched_Nhom.md) | **Tài liệu chính** | Bản đặc tả đề xuất dự án hoàn chỉnh: 5 tác nhân (Actor), 21 chức năng (F01–F21), sơ đồ tuần tự (Sequence Diagram), thiết kế cơ sở dữ liệu. |
| 🗄️ [`medsched_schema.sql`](./medsched_schema.sql) | **Database Script** | Kịch bản SQL hoàn chỉnh khởi tạo 9 bảng chuẩn CSDL PostgreSQL cùng dữ liệu mẫu (Seed data). |
| 🌐 [`medsched-architecture.html`](./medsched-architecture.html) | **Sơ đồ tương tác** | Sơ đồ kiến trúc hệ sinh thái tương tác trực quan (Interactive Architecture Viewer), hỗ trợ Light/Dark mode. |
| 🖼️ `medsched-architecture.visual-check.*.png` | **Ảnh sơ đồ** | Ảnh chụp kiến trúc hệ thống ở các độ phân giải cao phục vụ chèn vào Slide/Báo cáo Word. |
| 📑 [`01.md`](./01.md) / `01.docx` | **Đề cương gốc** | Yêu cầu gốc của giảng viên hướng dẫn về Đề tài 01: MedSched. |

---

## 👥 Danh Sách Tác Nhân Hệ Thống (Actors)

1. **Bệnh nhân (Patient):** Tìm kiếm bác sĩ, tư vấn triệu chứng với AI, đặt lịch trực tuyến, tải ảnh triệu chứng, nhận mã QR/vé hẹn.
2. **Nhân viên Tiếp đón / Lễ tân (Receptionist):** Quét mã QR check-in, quét CCCD/BHYT bằng camera YOLO11 tự động phân luồng tiếp đón.
3. **Bác sĩ (Doctor):** Quản lý lịch làm việc, xem hồ sơ bệnh án, xem ảnh tổn thương có bounding box từ YOLO11, kê đơn và nhập chẩn đoán.
4. **Quản trị viên (Admin):** Quản lý tài khoản người dùng, cấu hình ca khám, xem báo cáo thống kê lượt khám theo thời gian thực.
5. **Hệ thống AI (Spring AI & YOLO11):** Xử lý ngôn ngữ tự nhiên và thị giác máy tính chạy nền hỗ trợ nghiệp vụ.

---

## 🚀 Hướng Dẫn Cài Đặt Cơ Sở Dữ Liệu

### 1. Yêu Cầu Môi Trường
- **Docker** & **Docker Desktop** (hoặc PostgreSQL 16 cài trực tiếp).
- **DBeaver** hoặc công cụ quản trị PostgreSQL (pgAdmin).

### 2. Khởi Chạy Cơ Sở Dữ Liệu
Cơ sở dữ liệu MedSched được cấu hình chạy trên cổng **`5433`** (để tránh xung đột cổng 5432 mặc định):

- **Host:** `localhost`
- **Port:** `5433`
- **Database Name:** `medsched_db`
- **Username:** `eshop`
- **Password:** `eshop`

### 3. Nạp Cấu Trúc & Dữ Liệu Mẫu
Mở DBeaver kết nối vào `medsched_db` và thực thi toàn bộ script [`medsched_schema.sql`](./medsched_schema.sql):
```bash
# Hoặc thực thi qua Docker CLI:
docker exec -i eshop-db psql -U eshop -d medsched_db < medsched_schema.sql
```

Sau khi chạy xong, hệ sinh thái CSDL gồm 9 bảng quan hệ chặt chẽ:
- `users`: Tài khoản và phân quyền hệ thống.
- `patients`: Thông tin chi tiết bệnh nhân, CCCD, BHYT.
- `specialties`: Danh mục chuyên khoa y tế.
- `doctors`: Thông tin bác sĩ, học hàm, kinh nghiệm.
- `doctor_schedules` & `time_slots`: Ca trực và khung giờ khám (khóa chống trùng lịch).
- `appointments`: Lịch hẹn khám bệnh, mã vé QR, trạng thái tiếp đón.
- `symptom_images`: Ảnh tổn thương kèm tọa độ bounding box phân tích bởi YOLO11.
- `medical_records`: Hồ sơ bệnh án sau khi bác sĩ khám xong.

---

## 📊 Xem Sơ Đồ Quan Hệ Bảng (ER Diagram)
1. Mở phần mềm **DBeaver**.
2. Mở kết nối `medsched_db` ➔ `Schemas` ➔ `public`.
3. Nhấp đúp vào thư mục **`Tables`** ➔ Chọn tab **`Diagram`** ở trên thanh công cụ để xem sơ đồ ERD toàn diện.
4. Để xuất ảnh nộp báo cáo: Nhấp chuột phải vào khoảng trống sơ đồ ➔ Chọn **`Save diagram as ...`** ➔ Chọn định dạng **PNG**.

---

## 🛠️ Nhóm Thực Hiện
- **Học phần:** Java Spring 2 - Phát triển ứng dụng Web thông minh với Spring Boot & AI.
- **Dự án:** MedSched - Smart Healthcare Scheduling System.
- **Hạn chót bảo vệ đề xuất:** Thứ 6 tuần này.
