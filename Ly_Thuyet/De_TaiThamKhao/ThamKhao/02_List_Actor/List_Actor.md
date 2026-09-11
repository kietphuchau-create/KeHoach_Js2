# 👥 02. Danh Sách Tác Nhân (List Actors) - Dự Án MedSched

> **Học phần:** Java Spring 2 - Phát triển ứng dụng Web thông minh với Spring Boot & Spring AI  
> **Đề tài:** Hệ thống Quản lý Đặt lịch Khám & Tiếp đón Bệnh viện Thông minh (MedSched)  
> **Cập nhật:** Chuẩn hóa theo toàn bộ góp ý của Giảng viên & Kịch bản thực tế bệnh viện (Tập trung trọng tâm vào Spring Boot 3 + Spring AI, loại bỏ Computer Vision YOLO11).

---

## 1. Danh Sách 5 Tác Nhân Trong Hệ Thống

Hệ thống MedSched được thiết kế gồm **4 tác nhân con người (Human Actors)** và **1 tác nhân trí tuệ nhân tạo (AI Engine Actor)**:

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
             │(Spring AI Engine│
             └─────────────────┘
```

---

## 2. Chi Tiết Vai Trò & Trách Nhiệm Của Từng Tác Nhân

### 2.1. Bệnh Nhân (Patient)
- **Mục tiêu:** Tìm kiếm dịch vụ khám bệnh thuận tiện, không phải xếp hàng chờ đợi, nhận tư vấn sơ bộ chính xác và quản lý lịch khám gia đình.
- **Hành động chính:**
  - Tra cứu bác sĩ, chuyên khoa, chi phí khám.
  - Tương tác với Chatbot Spring AI để nhận diện triệu chứng sơ bộ và gợi ý đúng chuyên khoa.
  - Khảo sát tiền sử bệnh lý và triệu chứng chi tiết.
  - Chọn khung giờ (Time-slot) phù hợp và hoàn tất đặt lịch (chống trùng lịch bằng Optimistic Locking).
  - Quản lý hồ sơ gia đình: đặt lịch hộ cho bố mẹ, con cái, người thân.
  - Nhận mã vé hẹn điện tử kèm QR Code phục vụ check-in tiếp đón.
  - Xem lại lịch sử các lần khám, kết quả cận lâm sàng và đơn thuốc điện tử.
  - **Đánh giá & Chấm điểm Bác sĩ sau khi khám:** Gửi điểm 1-5 sao, nhận xét về sự hài lòng và đóng góp ý kiến cải thiện dịch vụ.

### 2.2. Nhân Viên Lễ Tân / Tiếp Đón (Receptionist)
- **Mục tiêu:** Tiếp đón bệnh nhân nhanh chóng, giảm ùn tắc tại sảnh chờ, điều phối bệnh nhân vào đúng phòng khám.
- **Hành động chính:**
  - Quét mã QR vé hẹn trên điện thoại bệnh nhân để check-in tức thì (< 1 giây).
  - Quét mã QR trên thẻ CCCD gắn chip / Thẻ BHYT của bệnh nhân bằng đầu đọc mã vạch chuyên dụng để tự động bóc tách thông tin và check-in tự động trong 1 giây.
  - Tiếp đón bệnh nhân vãng lai (Walk-in), bóc tách thông tin từ mã QR CCCD để điền form nhanh và cấp số thứ tự chờ (`WLK-xxx`).
  - In phiếu số thứ tự phòng khám.
  - Theo dõi màn hình điều phối hàng đợi thông minh (Smart Queue Monitor).

### 2.3. Bác Sĩ Khám Bệnh (Doctor)
- **Mục tiêu:** Nắm bắt nhanh tiền sử bệnh nhân, triệu chứng sơ bộ và chẩn đoán chính xác trong thời gian khám tối ưu.
- **Hành động chính:**
  - Xem danh sách bệnh nhân theo thứ tự số khám trong ca trực của mình.
  - Đọc **bản tóm tắt triệu chứng 2 dòng do Spring AI chuẩn bị trước** giúp nắm bắt ca bệnh trong 5 giây.
  - Xem lịch sử các lần khám bệnh cũ và các toa thuốc đã kê trước đó.
  - Ghi chép diễn biến khám bệnh, kết luận chẩn đoán (mã ICD-10).
  - Chỉ định cận lâm sàng (xét nghiệm, X-quang) chuyển trạng thái sang `WAITING_FOR_LAB_RESULTS` theo quy trình 2 pha.
  - Kê đơn thuốc điện tử và chỉ định tái khám.
  - Đăng ký và cập nhật lịch làm việc hàng tuần (báo nghỉ khẩn cấp khi có ca cấp cứu).
  - **Theo dõi phản hồi & Điểm đánh giá (Rating/Feedback):** Xem mức độ hài lòng từ bệnh nhân để nâng cao chất lượng tư vấn và thái độ phục vụ.

### 2.4. Quản Trị Viên (System Administrator)
- **Mục tiêu:** Đảm bảo hệ thống vận hành an toàn, thông suốt, bảo mật dữ liệu y tế.
- **Hành động chính:**
  - Quản trị danh mục: Cơ sở y tế (Medical Centers), Chuyên khoa, phòng khám, bảng giá dịch vụ.
  - Quản trị tài khoản người dùng và phân quyền RBAC (Role-Based Access Control).
  - Cấu hình hệ thống tập trung (System Settings): thời lượng slot, khoảng đệm, giới hạn hủy lịch, giới hạn No-show.
  - Xem Dashboard thống kê: Lượng bệnh nhân theo chuyên khoa, tỷ lệ đúng giờ, doanh thu.
  - **Giám sát chỉ số hài lòng (CSAT) & Đánh giá tiêu cực:** Nhận cảnh báo tự động từ Spring AI khi có đánh giá tiêu cực để liên hệ hỗ trợ bệnh nhân và cải thiện quy trình y tế.
  - Giám sát nhật ký hệ thống (Audit Trail) và lịch sử thay đổi trạng thái ca khám để đảm bảo tuân thủ quy định y tế.

### 2.5. Tác Nhân Hệ Thống AI (Spring AI Engine Actor)
- **Bao gồm:** Spring Boot 3 + Spring AI ChatClient, LangChain4j, kho vector cho RAG y khoa (giải pháp ngoài, CSDL chính vẫn là MySQL/XAMPP).
- **Trách nhiệm tự động hóa:**
  - **Tư vấn & Phân luồng chuyên khoa (Clinical Triage):** Phân tích ngữ nghĩa mô tả triệu chứng tự nhiên của bệnh nhân để tự động đề xuất chuyên khoa khám phù hợp nhất.
  - **Bản tóm tắt bệnh án 2 dòng (2-line Clinical Summary):** Trích xuất ngắn gọn triệu chứng chính, thời gian khởi phát và thuốc đang dùng để bác sĩ nắm bắt nhanh trước khi bệnh nhân bước vào phòng khám.
  - **Phân tích cảm xúc nhận xét (Sentiment Analysis):** Đọc nội dung bình luận của bệnh nhân, phân loại tự động thành `POSITIVE`, `NEUTRAL`, hoặc `NEGATIVE` và gắn cờ cảnh báo quản trị viên nếu có vấn đề nghiêm trọng.
  - **Bộ lọc cảnh báo đỏ (Emergency Red-Flag Guardrails):** Kiểm tra các triệu chứng nguy kịch (khó thở cấp, đau thắt ngực, đột quỵ, nôn ra máu) để hiển thị cảnh báo đỏ khẩn cấp, hướng dẫn gọi 115 hoặc đến phòng cấp cứu gần nhất thay vì đặt lịch khám thường.
  - **RAG Y khoa (Retrieval-Augmented Generation):** Truy vấn cơ sở tri thức y khoa đã được vector hóa để cung cấp các lời khuyên sơ cứu và giải thích thuật ngữ y tế chuẩn xác.
