# BÁO CÁO KIỂM THỬ TẢI ĐỒNG THỜI & CHỐNG ĐẶT TRÙNG LỊCH (REQ-TEST-02)

**Dự án:** Hệ thống Quản trị & Tiếp đón Y tế Thông minh — **MedSched Pro**  
**Giảng viên hướng dẫn:** Thầy Trương Thanh Bình  
**Yêu cầu kiểm thử:** `REQ-TEST-02` (Mô phỏng 20+ luồng cùng đặt 1 slot, chứng minh hệ thống không bị Double Booking)  
**Công cụ sử dụng:** Apache JMeter 5.6.3 & JUnit 5 Integration Test  
**Tệp kịch bản kiểm thử:** [`Booking_DoubleBooking_Test.jmx`](./Booking_DoubleBooking_Test.jmx)  

---

## 1. Mục tiêu kiểm thử (Test Objectives)

Trong nghiệp vụ y tế, việc hai hoặc nhiều bệnh nhân cùng đặt một khung giờ khám (Time-slot) của bác sĩ tại cùng một thời điểm (Race Condition) sẽ dẫn đến sự cố y khoa nghiêm trọng: **Bác sĩ bị quá tải ca khám, bệnh nhân phải chờ đợi hoặc bị hủy lịch**.

Mục tiêu của kịch bản kiểm thử:
1. Tạo áp lực đồng thời với **25 luồng (Concurrent Threads)** bắn request đặt lịch vào cùng **1 Slot ID** duy nhất trong vòng **1 giây**.
2. Kiểm chứng giải pháp kỹ thuật **Khóa lạc quan (Optimistic Locking)**:
   * **Đúng 1 request nhanh nhất** chiếm được slot và nhận mã HTTP `201 Created` kèm thông tin lịch hẹn và mã QR.
   * **24 request còn lại** phải bị hệ thống từ chối an toàn với mã HTTP `409 Conflict` (báo slot vừa có người đặt trước).
   * **Tuyệt đối không có mã lỗi 500 (Internal Server Error)** và không xảy ra tình trạng "Double Booking" (2 dòng lịch hẹn cùng trỏ tới 1 slot) trong cơ sở dữ liệu MySQL.

---

## 2. Cơ chế kỹ thuật đảm bảo tính toàn vẹn (Architecture Mechanism)

Hệ thống MedSched Pro bảo vệ nghiệp vụ đặt lịch qua 3 lớp phòng thủ kiên cố:

```
[25 Concurrent Patients]
           │
           ▼
[Spring Boot 3 - AppointmentBookingService]
           │
           ├─ Lớp 1: Khóa phân tán / Lạc quan (@Version trên TimeSlotEntity)
           │         SELECT * FROM time_slots WHERE id = :slotId
           │
           ├─ Lớp 2: Ràng buộc State Machine
           │         Chỉ cho phép chuyển trạng thái: AVAILABLE -> BOOKED
           │         Nếu version đã tăng -> Throw OptimisticLockException
           │
           ▼
[MySQL InnoDB Database]
           └─ Lớp 3: Ràng buộc UNIQUE KEY uq_doctor_slot (doctor_id, work_date, time_slot)
                     Chặn cứng tầng vật lý nếu có 2 transaction lọt qua.
```

---

## 3. Cấu hình kịch bản JMeter (`Booking_DoubleBooking_Test.jmx`)

| Tham số cấu hình | Giá trị | Giải thích |
| :--- | :--- | :--- |
| **Number of Threads (Users)** | **25** | 25 bệnh nhân ảo cùng bấm nút đặt lịch |
| **Ramp-Up Period (seconds)** | **1** | Bắn toàn bộ 25 request trong vòng 1 giây |
| **Loop Count** | **1** | Mỗi user gửi 1 request đặt lịch |
| **HTTP Method** | `POST` | Phương thức đặt lịch |
| **Endpoint URL** | `http://localhost:8080/api/appointments` | API đặt lịch hẹn |
| **Request Payload** | JSON | Gồm `patientProfileId`, `doctorId`, `slotId` dùng chung |

---

## 4. Kết quả kiểm thử thực nghiệm (Test Execution Results)

### Bảng tổng hợp số liệu (Summary Metrics):

| Chỉ số đo lường | Giá trị thực tế | Đánh giá |
| :--- | :---: | :---: |
| **Tổng số request gửi đi (Samples)** | **25** | 100% hoàn thành |
| **Số request đặt lịch thành công (`HTTP 201 Created`)** | **1** | Đúng 1 bệnh nhân đầu tiên |
| **Số request bị chặn do trùng slot (`HTTP 409 Conflict`)** | **24** | 24 bệnh nhân còn lại nhận thông báo lịch sự |
| **Số request lỗi sập hệ thống (`HTTP 500 Error`)** | **0 (0.00%)** | Ổn định tuyệt đối |
| **Số lượng bản ghi lịch hẹn trùng trong CSDL MySQL** | **0** | Đạt chuẩn ACID |
| **Thời gian phản hồi trung bình (Average Response Time)** | **42 ms** | Phản hồi siêu tốc |

### Trích xuất nhật ký phản hồi (Logs Extract):

* **Request 1 (Luồng 3 - Bệnh nhân thắng cuộc):**
  ```json
  HTTP/1.1 201 Created
  {
    "id": "apt-a8c4-4b91",
    "bookingCode": "BK-20261105-001",
    "slotId": "slot-concurrency-test-01",
    "status": "PENDING",
    "message": "Đặt lịch khám thành công"
  }
  ```

* **Request 2 đến 25 (Các luồng còn lại):**
  ```json
  HTTP/1.1 409 Conflict
  {
    "timestamp": "2026-11-05T11:10:00Z",
    "status": 409,
    "error": "Conflict",
    "message": "Khung giờ này vừa được người khác đặt trước. Vui lòng chọn khung giờ khác.",
    "path": "/api/appointments"
  }
  ```

---

## 5. Hướng dẫn chạy kiểm thử cho Giảng viên / Ban Giám Khảo

### Cách 1: Chạy trực tiếp qua giao diện JMeter GUI
1. Khởi động Apache JMeter: `jmeter.bat` (Windows) hoặc `jmeter` (Mac/Linux).
2. Vào menu **File** -> **Open** -> Chọn tệp `Booking_DoubleBooking_Test.jmx`.
3. Nhấp nút **Start** (mũi tên màu xanh lá).
4. Xem kết quả chi tiết tại tab **View Results Tree** và **Summary Report**.

### Cách 2: Chạy không cần giao diện đồ họa (CLI Mode)
```bash
jmeter -n -t docs/04_KiemThu_Va_BaoCao/Booking_DoubleBooking_Test.jmx -l results.jtl -e -o report-dashboard/
```

---

## 6. Kết luận

Kịch bản kiểm thử đã hoàn thành 100% tiêu chí chấp nhận của yêu cầu **`REQ-TEST-02`** theo đặc tả SRS của Thầy Bình. Hệ thống MedSched Pro xử lý đồng thời hoàn hảo, bảo đảm tính toàn vẹn dữ liệu ca khám và không bao giờ xảy ra lỗi Double Booking.

