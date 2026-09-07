# 👥 02. Danh Sách Tác Nhân (List Actors) - Dự Án MedSched

> **Học phần:** Java Spring 2 - Phát triển ứng dụng Web thông minh với Spring Boot & AI  
> **Đề tài:** Hệ thống Quản lý Đặt lịch Khám & Tiếp đón Bệnh viện Thông minh (MedSched)

---

## 1. Danh Sách 5 Tác Nhân Trong Hệ Thống

Hệ thống MedSched được thiết kế gồm **4 tác nhân con người (Human Actors)** và **1 tác nhân hệ thống thông minh (AI System Actor)**:

```
                  ┌──────────────────────┐
                  │      MEDSCHED        │
                  └──────────┬───────────┘
         ┌────────────┬──────┴──────┬────────────┐
         ▼            ▼             ▼            ▼
   ┌───────────┐ ┌──────────┐ ┌───────────┐ ┌─────────┐
   │  PATIENT  │ │RECEPTION │ │  DOCTOR   │ │  ADMIN  │
   │(Bệnh nhân)│ │ (Lễ tân) │ │ (Bác sĩ)  │ │(Quản trị│
   └─────┬─────┘ └────┬─────┘ └─────┬─────┘ └─────────┘
         │            │             │
         └────────────┼─────────────┘
                      ▼
             ┌─────────────────┐
             │ AI SYSTEM ACTOR │
             │(Spring AI/YOLO) │
             └─────────────────┘
```

---

## 2. Chi Tiết Vai Trò & Trách Nhiệm Của Từng Tác Nhân

### 2.1. Bệnh Nhân (Patient)
- **Mục tiêu:** Tìm kiếm dịch vụ khám bệnh thuận tiện, không phải xếp hàng chờ đợi, nhận tư vấn sơ bộ chính xác.
- **Hành động chính:**
  - Tra cứu bác sĩ, chuyên khoa, chi phí khám.
  - Tương tác với Chatbot Spring AI để nhận diện triệu chứng sơ bộ.
  - Tải ảnh tổn thương ngoài da để tiền sàng lọc qua YOLO11.
  - Chọn khung giờ (Time-slot) phù hợp và hoàn tất đặt lịch.
  - Nhận mã vé hẹn điện tử kèm QR Code.
  - Xem lại lịch sử các lần khám và đơn thuốc đã kê.
  - **Đánh giá & Chấm điểm Bác sĩ sau khi khám:** Gửi điểm 1-5 sao, nhận xét về sự hài lòng và đóng góp ý kiến cải thiện dịch vụ.

### 2.2. Nhân Viên Lễ Tân / Tiếp Đón (Receptionist)
- **Mục tiêu:** Tiếp đón bệnh nhân nhanh chóng, giảm ùn tắc tại sảnh chờ, chuyển bệnh nhân vào đúng phòng khám.
- **Hành động chính:**
  - Quét mã QR vé hẹn trên điện thoại bệnh nhân để check-in tức thì (< 1 giây).
  - Đặt thẻ CCCD / Thẻ BHYT của bệnh nhân vào camera để YOLO11 tự động bóc tách thông tin và check-in tự động (< 3 giây).
  - Tiếp đón bệnh nhân vãng lai (chưa đặt hẹn), tạo hồ sơ nhanh qua CCCD.
  - In phiếu số thứ tự phòng khám.
  - Theo dõi màn hình điều phối hàng đợi (Queue Monitor).

### 2.3. Bác Sĩ Khám Bệnh (Doctor)
- **Mục tiêu:** Nắm bắt nhanh tiền sử bệnh, hình ảnh tổn thương và chẩn đoán chính xác trong thời gian khám tối ưu.
- **Hành động chính:**
  - Xem danh sách bệnh nhân theo thứ tự số khám trong ca trực của mình.
  - Đọc **tóm tắt triệu chứng 2 dòng do Spring AI chuẩn bị trước**.
  - Xem ảnh tổn thương da có khoanh vùng Bounding Box và nhãn nhận diện từ YOLO11.
  - Ghi chép diễn biến khám bệnh, kết luận chẩn đoán (mã ICD-10).
  - Kê đơn thuốc điện tử và chỉ định tái khám / xét nghiệm.
  - Đăng ký và cập nhật lịch làm việc hàng tuần.
  - **Theo dõi phản hồi & Điểm đánh giá (Rating/Feedback):** Xem mức độ hài lòng từ bệnh nhân để nâng cao chất lượng tư vấn và thái độ phục vụ.

### 2.4. Quản Trị Viên (System Administrator)
- **Mục tiêu:** Đảm bảo hệ thống vận hành an toàn, thông suốt, bảo mật dữ liệu y tế.
- **Hành động chính:**
  - Quản trị danh mục: Chuyên khoa, phòng khám, bảng giá dịch vụ.
  - Quản trị tài khoản người dùng và phân quyền RBAC (Role-Based Access Control).
  - Cấu hình ca trực của bác sĩ, độ dài slot khám, giới hạn số lượt mỗi ca.
  - Xem Dashboard thống kê: Lượng bệnh nhân theo chuyên khoa, tỷ lệ đúng giờ, doanh thu.
  - **Giám sát chỉ số hài lòng (CSAT) & Đánh giá tiêu cực:** Nhận cảnh báo tự động từ AI khi có đánh giá tiêu cực để liên hệ hỗ trợ bệnh nhân và cải thiện quy trình y tế.
  - Giám sát nhật ký hệ thống (Audit Trail) để đảm bảo tuân thủ quy định y tế.

### 2.5. Tác Nhân Hệ Thống AI (AI System Actor)
- **Bao gồm:** Spring AI (LLM Integration) và Ultralytics YOLO11 (Computer Vision Engine).
- **Trách nhiệm tự động hóa:**
  - **Spring AI:** 
    - Phân tích ngữ nghĩa mô tả của bệnh nhân để tự động đề xuất chuyên khoa khám phù hợp.
    - Trích xuất tóm tắt ngắn 2 dòng cho bác sĩ.
    - **Phân tích cảm xúc nhận xét (Sentiment Analysis):** Đọc nội dung bình luận của bệnh nhân, phân loại tự động thành `POSITIVE`, `NEUTRAL`, hoặc `NEGATIVE` và gắn cờ cảnh báo quản trị viên nếu có vấn đề nghiêm trọng.
  - **YOLO11 Service:**
    - Phát hiện vùng phôi thẻ CCCD/BHYT trong luồng video camera lễ tân, xoay thẳng ảnh và kích hoạt OCR.
    - Nhận diện vùng tổn thương da trên ảnh bệnh nhân tải lên, vẽ bounding box và gán nhãn dự đoán.
