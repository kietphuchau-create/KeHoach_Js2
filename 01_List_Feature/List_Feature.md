# 📋 01. Danh Sách Tính Năng (List Features) - Dự Án MedSched

> **Học phần:** Java Spring 2 - Phát triển ứng dụng Web thông minh với Spring Boot & AI  
> **Đề tài:** Hệ thống Quản lý Đặt lịch Khám & Tiếp đón Bệnh viện Thông minh (MedSched)

---

## 1. Phân Loại Tính Năng Theo Khối Nghiệp Vụ

### 1.1. Khối Đặt Lịch & Tư Vấn Bệnh Nhân (Patient Facing)
- **F01 - Tra cứu thông tin Chuyên khoa & Bác sĩ:** Tìm kiếm bác sĩ theo chuyên khoa, học hàm, đánh giá và giá khám.
- **F02 - Tư vấn phân loại chuyên khoa bằng Spring AI:** Chatbot tiếp nhận mô tả triệu chứng tự nhiên từ bệnh nhân (ví dụ: *"Tôi bị đau nhói vùng ngực trái khi gắng sức"*), AI tự động suy luận và gợi ý khoa Tim mạch.
- **F03 - Đặt lịch khám theo khung giờ (Time-slot):** Xem lịch làm việc của bác sĩ theo ngày, chọn khung giờ còn trống (khóa chống trùng lịch).
- **F04 - Tải ảnh tổn thương tiền sàng lọc qua YOLO11:** Cho phép bệnh nhân chụp và tải ảnh tổn thương ngoài da (mẩn ngứa, nốt ruồi, phát ban...). YOLO11 tự động phân tích và khoanh vùng tổn thương.
- **F05 - Quản lý phiếu khám & Mã QR vé hẹn:** Sinh mã đặt chỗ duy nhất (Booking Code) kèm mã QR phục vụ check-in nhanh.
- **F06 - Hủy / Thay đổi lịch hẹn:** Người dùng có thể hủy lịch trước giờ khám tối thiểu 2 tiếng theo quy định.

### 1.2. Khối Tiếp Đón & Điều Phối (Receptionist Facing)
- **F07 - Check-in bằng mã QR tại quầy:** Lễ tân quét mã QR trên điện thoại bệnh nhân, hệ thống chuyển trạng thái sang `CHECKED_IN` trong 1 giây.
- **F08 - Check-in tự động bằng Camera YOLO11 (CCCD / Thẻ BHYT):**
  - Camera quét thẻ CCCD hoặc BHYT của bệnh nhân khi tới quầy.
  - YOLO11 định vị vùng thẻ, kích hoạt OCR bóc tách Họ tên, Số CCCD/BHYT, Ngày sinh.
  - Hệ thống tự động khớp với lịch hẹn đã đặt trước và in phiếu số thứ tự phòng khám (hoàn tất trong 3 giây).
- **F09 - Đăng ký khám trực tiếp (Walk-in):** Hỗ trợ tiếp đón bệnh nhân chưa đặt hẹn trước, tự động lấy thông tin từ CCCD quét qua YOLO11 để điền form nhanh.
- **F10 - Màn hình điều phối hàng đợi (Queue Monitor):** Hiển thị danh sách bệnh nhân đang chờ, đã vào khám theo từng phòng chức năng.

### 1.3. Khối Phòng Khám Bác Sĩ (Doctor Facing)
- **F11 - Danh sách ca khám trong ngày:** Bác sĩ xem danh sách bệnh nhân theo thứ tự số và khung giờ đã check-in.
- **F12 - Xem tóm tắt triệu chứng AI (Spring AI 2-line Summary):** Hiển thị bản tóm tắt súc tích do AI trích xuất từ phần mô tả của bệnh nhân, giúp bác sĩ nắm bắt tình trạng trong 5 giây trước khi bệnh nhân bước vào.
- **F13 - Xem ảnh phân tích thị giác máy tính YOLO11:** Hiển thị ảnh bệnh nhân đã tải lên với khung bounding box khoanh vùng và độ tin cậy nhận diện.
- **F14 - Cập nhật hồ sơ bệnh án & Kê đơn thuốc điện tử:** Nhập triệu chứng thực tế, chẩn đoán ICD-10, chỉ định cận lâm sàng và đơn thuốc.
- **F15 - Hoàn thành ca khám:** Chuyển trạng thái ca hẹn sang `COMPLETED`, lưu trữ hồ sơ bệnh án số.
- **F16 - Đăng ký / Quản lý lịch trực cá nhân:** Bác sĩ đăng ký ca trực tuần tới để hệ sinh thái mở slot đặt hẹn.

### 1.4. Khối Quản Trị Hệ Thống (Admin Facing)
- **F17 - Quản lý danh mục Chuyên khoa & Dịch vụ y tế:** Thêm, sửa, đóng/mở các chuyên khoa trong bệnh viện.
- **F18 - Quản trị tài khoản & Phân quyền RBAC:** Cấp tài khoản Bác sĩ, Lễ tân, Admin với quyền truy cập nghiêm ngặt.
- **F19 - Cấu hình ca khám (Shift & Slot Templates):** Thiết lập độ dài ca khám (15 phút/slot, 30 phút/slot), giới hạn số lượt mỗi ca.
- **F20 - Báo cáo thống kê thời gian thực:** Biểu đồ lượt khám theo chuyên khoa, tỷ lệ đúng giờ, tỷ lệ hủy lịch, thời gian chờ trung bình.
- **F21 - Nhật ký hệ thống (Audit Logs):** Ghi vết các hành động sửa lịch hẹn, hủy vé, cập nhật bệnh án đảm bảo an toàn y tế.

---

## 2. Ma Trận Phân Quyền Tính Năng Theo Vai Trò

| Mã CN | Tên Tính Năng | Patient | Receptionist | Doctor | Admin |
|:---|:---|:---:|:---:|:---:|:---:|
| **F01** | Tra cứu Chuyên khoa / Bác sĩ | ✅ | ✅ | ✅ | ✅ |
| **F02** | Tư vấn gợi ý khoa bằng Spring AI | ✅ | ❌ | ❌ | ❌ |
| **F03** | Đặt lịch trực tuyến (Time-slot) | ✅ | ✅ | ❌ | ❌ |
| **F04** | Tải ảnh tổn thương sàng lọc YOLO11 | ✅ | ❌ | ❌ | ❌ |
| **F05** | Nhận mã QR & Quản lý vé hẹn | ✅ | ❌ | ❌ | ❌ |
| **F06** | Hủy / Đổi lịch hẹn | ✅ | ✅ | ❌ | ✅ |
| **F07** | Quét QR Check-in tiếp đón | ❌ | ✅ | ❌ | ❌ |
| **F08** | Quét CCCD/BHYT tự động bằng YOLO11 | ❌ | ✅ | ❌ | ❌ |
| **F09** | Tiếp đón bệnh nhân vãng lai (Walk-in) | ❌ | ✅ | ❌ | ❌ |
| **F10** | Màn hình điều phối hàng đợi | ❌ | ✅ | ✅ | ✅ |
| **F11** | Danh sách ca khám trong ngày | ❌ | ❌ | ✅ | ❌ |
| **F12** | Xem tóm tắt triệu chứng Spring AI | ❌ | ❌ | ✅ | ❌ |
| **F13** | Xem ảnh nhận diện YOLO11 | ❌ | ❌ | ✅ | ❌ |
| **F14** | Nhập bệnh án & Kê đơn thuốc | ❌ | ❌ | ✅ | ❌ |
| **F15** | Hoàn tất ca khám | ❌ | ❌ | ✅ | ❌ |
| **F16** | Đăng ký lịch làm việc | ❌ | ❌ | ✅ | ✅ |
| **F17** | Quản lý Chuyên khoa / Dịch vụ | ❌ | ❌ | ❌ | ✅ |
| **F18** | Quản trị tài khoản & Phân quyền | ❌ | ❌ | ❌ | ✅ |
| **F19** | Cấu hình Template ca khám | ❌ | ❌ | ❌ | ✅ |
| **F20** | Dashboard Báo cáo thống kê | ❌ | ❌ | ❌ | ✅ |
| **F21** | Audit Log & Giám sát bảo mật | ❌ | ❌ | ❌ | ✅ |
