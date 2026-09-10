# 📋 01. Danh Sách Tính Năng (List Features) - Dự Án MedSched (Phiên Bản 2.0)

> **Học phần:** Java Spring 2 - Phát triển ứng dụng Web thông minh với Spring Boot & Spring AI  
> **Đề tài:** Hệ thống Quản lý Đặt lịch Khám & Tiếp đón Bệnh viện Thông minh (MedSched)  
> **Cập nhật:** Chuẩn hóa theo toàn bộ góp ý của Giảng viên & Kịch bản thực tế bệnh viện (Tập trung trọng tâm vào Spring Boot 3 + Spring AI, thay thế thị giác máy tính YOLO11 bằng đầu đọc mã QR CCCD gắn chip chuẩn y tế).

---

## 1. Phân Loại Tính Năng Theo Khối Nghiệp Vụ

### 1.1. Khối Đặt Lịch & Tư Vấn Bệnh Nhân (Patient Facing)
- **F01 - Tra cứu thông tin Chuyên khoa & Bác sĩ:** Tìm kiếm bác sĩ theo chuyên khoa, học hàm, đánh giá và giá khám.
- **F02 - Tư vấn phân loại chuyên khoa bằng Spring AI:** Chatbot tiếp nhận mô tả triệu chứng tự nhiên, tự động gợi ý chuyên khoa phù hợp kèm khuyến cáo y tế.
- **F03 - Đặt lịch khám theo khung giờ (Time-slot):** Xem lịch làm việc của bác sĩ theo ngày, chọn khung giờ còn trống (khóa lạc quan Optimistic Locking chống trùng lịch).
- **F04 - Khảo sát & Phân tích tiền sử bệnh chuyên sâu qua Spring AI:** Tiếp nhận mô tả bệnh lý chi tiết, tiền sử dùng thuốc, dị ứng và tự động cấu trúc hóa dữ liệu gửi cho Bác sĩ.
- **F05 - Quản lý phiếu khám & Mã QR vé hẹn:** Sinh mã đặt chỗ duy nhất (Booking Code) kèm mã QR phục vụ check-in nhanh tại quầy tiếp đón.
- **F06 - Hủy / Thay đổi lịch hẹn:** Bệnh nhân có thể hủy lịch trước giờ khám tối thiểu 2 tiếng theo quy định cấu hình hệ thống.
- **F22 - Đánh giá chất lượng sau khám & Phân tích cảm xúc qua Spring AI (Verified Review & Sentiment Analysis):** Chỉ mở khóa form đánh giá cho ca khám đã `COMPLETED`. Spring AI tự động phân tích cảm xúc (Positive / Neutral / Negative) để cảnh báo phản hồi tiêu cực cho Quản trị viên.
- **F24 (MỚI) - Quản lý hồ sơ gia đình & Đặt lịch hộ người thân:** 1 tài khoản có thể tạo nhiều hồ sơ người khám (`Bản thân`, `Bố mẹ`, `Con cái`, `Vợ/chồng`) để khi người thân đến quét CCCD tại quầy luôn khớp chính xác thông tin.
- **F26 (MỚI) - Bộ lọc cảnh báo đỏ triệu chứng cấp cứu (Spring AI Red-Flag Guardrails):** Tự động phát hiện các từ khóa triệu chứng nguy kịch (đau tim, ngất xỉu, nôn ra máu) để hiển thị cảnh báo đỏ yêu cầu gọi ngay 115 hoặc đi cấp cứu, tuyệt đối không cho đặt lịch khám thường.
- **F28 (MỚI) - Cổng thanh toán linh hoạt:** Hỗ trợ thanh toán tiền mặt/quẹt thẻ tại quầy khi Check-in (`PAID_AT_COUNTER`), kèm tùy chọn đặt cọc giữ slot online qua VNPay/MoMo Sandbox nhằm giảm thiểu tỷ lệ bùng hẹn (No-show).

### 1.2. Khối Tiếp Đón & Điều Phối Hàng Đợi (Receptionist Facing)
- **F07 - Check-in bằng mã QR tại quầy:** Lễ tân quét mã QR trên vé điện tử của bệnh nhân, chuyển trạng thái sang `CHECKED_IN` trong 1 giây.
- **F08 - Tiếp đón tự động bằng đầu đọc mã QR thẻ CCCD gắn chip / Thẻ BHYT:** Quét mã QR chuẩn Bộ Công An trên thẻ CCCD chip hoặc thẻ BHYT, bóc tách chính xác Họ tên, Số CCCD, Ngày sinh và tự động khớp lịch hẹn trong 1 giây mà không phụ thuộc mô hình thị giác máy tính nặng.
- **F09 - Đăng ký khám trực tiếp (Walk-in):** Tiếp đón bệnh nhân vãng lai chưa đặt trước, tự động lấy thông tin từ mã QR CCCD quét tại quầy để điền form nhanh và cấp số thứ tự chờ (`WLK-xxx`).
- **F10 - Màn hình điều phối hàng đợi (Queue Monitor):** Hiển thị danh sách bệnh nhân đang chờ, số thứ tự đang khám theo từng phòng chức năng.
- **F23 (MỚI) - Thuật toán điều phối hàng đợi ưu tiên thông minh (Smart Examination Queue Engine):**
  - Đảm bảo ưu tiên số 1 cho bệnh nhân đặt online (`APP-xxxx`) khi đến đúng khung giờ hẹn.
  - Tự động tận dụng khoảng thời gian trống (khi bác sĩ khám ca online nhanh chỉ mất 10p/slot 30p) để kéo bệnh nhân vãng lai (`WLK-xxx`) vào khám ngay, triệt tiêu thời gian "chết" của phòng khám.
  - Tự động chuyển ca online đến trễ (> 15 phút) về cuối hàng đợi của khung giờ kế tiếp.

### 1.3. Khối Phòng Khám Bác Sĩ (Doctor Facing)
- **F11 - Danh sách ca khám trong ngày:** Bác sĩ xem danh sách bệnh nhân theo thứ tự số và khung giờ đã check-in.
- **F12 - Xem tóm tắt triệu chứng AI (Spring AI 2-line Summary):** Bản tóm tắt súc tích giúp bác sĩ nắm tình trạng bệnh nhân trong 5 giây trước khi vào phòng.
- **F13 - Xem lịch sử khám bệnh & Toa thuốc cũ (Medical History Viewer):** Truy xuất tức thì lịch sử khám, bệnh lý nền và đơn thuốc đã kê trong các lần khám trước.
- **F14 - Cập nhật hồ sơ bệnh án & Kê đơn thuốc điện tử:** Nhập chẩn đoán ICD-10, chỉ định cận lâm sàng và đơn thuốc.
- **F15 - Hoàn tất ca khám:** Chuyển trạng thái ca hẹn sang `COMPLETED`, lưu trữ hồ sơ bệnh án số.
- **F16 - Đăng ký / Quản lý lịch trực cá nhân:** Bác sĩ đăng ký ca trực tuần tới hoặc báo trạng thái khẩn cấp/nghỉ đột xuất (`CANCELLED_EMERGENCY`) để hệ thống kích hoạt luồng điều chuyển bệnh nhân tự động.
- **F29 (MỚI) - Quy trình cận lâm sàng 2 pha (Two-Phase Flow):** Bác sĩ chuyển ca hẹn sang `WAITING_FOR_LAB_RESULTS` khi chỉ định xét nghiệm/X-quang; khi bệnh nhân quay lại đọc kết quả sẽ được cấp số ưu tiên (`LAB-xx`) xen kẽ với ca mới mà không phải xếp hàng lại từ đầu.

### 1.4. Khối Quản Trị Hệ Thống (Admin Facing)
- **F17 - Quản lý danh mục Chuyên khoa & Dịch vụ y tế:** Thêm, sửa, đóng/mở các chuyên khoa trong bệnh viện.
- **F18 - Quản trị tài khoản & Phân quyền RBAC:** Cấp tài khoản Bác sĩ, Lễ tân, Admin với quyền truy cập nghiêm ngặt.
- **F19 - Cấu hình hệ thống tập trung (System Settings):** Cấu hình thời lượng slot (30 phút), khoảng đệm buffer (5 phút), thời hạn hủy lịch (2 giờ), số lần vi phạm No-show tối đa.
- **F20 - Báo cáo thống kê thời gian thực:** Biểu đồ lượt khám theo chuyên khoa, tỷ lệ đúng giờ, tỷ lệ hủy lịch, thời gian chờ trung bình.
- **F21 - Nhật ký hệ thống & Kiểm toán (Audit Logs):** Ghi vết các hành động sửa lịch hẹn, hủy vé, cập nhật bệnh án đảm bảo an toàn y tế.
- **F25 (MỚI) - Lịch sử thay đổi trạng thái ca hẹn (Appointment Status History Logs):** Bảng ghi nhận chi tiết ai đổi trạng thái, lý do đổi và thời điểm đổi.
- **F27 (MỚI) - Quản lý cơ sở y tế đa chi nhánh (Medical Centers / SaaS Extensibility):** Khả năng quản lý nhiều cơ sở y tế / phòng khám trên cùng một nền tảng phần mềm.

---

## 2. Ma Trận Phân Quyền Tính Năng Theo Vai Trò (RBAC Matrix)

| Mã CN | Tên Tính Năng | Patient | Receptionist | Doctor | Admin |
|:---|:---|:---:|:---:|:---:|:---:|
| **F01** | Tra cứu Chuyên khoa / Bác sĩ | ✅ | ✅ | ✅ | ✅ |
| **F02** | Tư vấn gợi ý khoa bằng Spring AI | ✅ | ❌ | ❌ | ❌ |
| **F03** | Đặt lịch trực tuyến (Time-slot) | ✅ | ✅ | ❌ | ❌ |
| **F04** | Khảo sát tiền sử bệnh lý chuyên sâu (AI) | ✅ | ❌ | ❌ | ❌ |
| **F05** | Nhận mã QR & Quản lý vé hẹn | ✅ | ❌ | ❌ | ❌ |
| **F06** | Hủy / Đổi lịch hẹn | ✅ | ✅ | ❌ | ✅ |
| **F07** | Quét QR vé hẹn Check-in tiếp đón | ❌ | ✅ | ❌ | ❌ |
| **F08** | Quét mã QR thẻ CCCD/BHYT tiếp đón | ❌ | ✅ | ❌ | ❌ |
| **F09** | Tiếp đón bệnh nhân vãng lai (Walk-in) | ❌ | ✅ | ❌ | ❌ |
| **F10** | Màn hình điều phối hàng đợi | ❌ | ✅ | ✅ | ✅ |
| **F11** | Danh sách ca khám trong ngày | ❌ | ❌ | ✅ | ❌ |
| **F12** | Xem tóm tắt triệu chứng Spring AI | ❌ | ❌ | ✅ | ❌ |
| **F13** | Xem lịch sử khám & Toa thuốc cũ | ❌ | ❌ | ✅ | ❌ |
| **F14** | Nhập bệnh án & Kê đơn thuốc | ❌ | ❌ | ✅ | ❌ |
| **F15** | Hoàn tất ca khám | ❌ | ❌ | ✅ | ❌ |
| **F16** | Đăng ký ca trực & Báo khẩn cấp | ❌ | ❌ | ✅ | ✅ |
| **F17** | Quản lý Chuyên khoa / Dịch vụ | ❌ | ❌ | ❌ | ✅ |
| **F18** | Quản trị tài khoản & Phân quyền | ❌ | ❌ | ❌ | ✅ |
| **F19** | Cấu hình hệ thống (System Settings) | ❌ | ❌ | ❌ | ✅ |
| **F20** | Dashboard Báo cáo thống kê | ❌ | ❌ | ❌ | ✅ |
| **F21** | Audit Log & Giám sát bảo mật | ❌ | ❌ | ❌ | ✅ |
| **F22** | Đánh giá bác sĩ & Phân tích cảm xúc AI | ✅ (Tạo) | ❌ | ✅ (Xem) | ✅ (Quản lý) |
| **F23** | Thuật toán điều phối hàng đợi thông minh | ❌ | ✅ | ✅ | ✅ |
| **F24** | Quản lý hồ sơ gia đình & Đặt lịch hộ | ✅ | ✅ | ❌ | ❌ |
| **F25** | Lịch sử trạng thái ca khám (Status Logs) | ❌ | ✅ | ✅ | ✅ |
| **F26** | Bộ lọc cấp cứu đỏ (AI Red-flag Guardrails) | ✅ | ❌ | ❌ | ❌ |
| **F27** | Quản lý đa cơ sở y tế (SaaS Model) | ❌ | ❌ | ❌ | ✅ |
| **F28** | Thanh toán quầy & Cọc trực tuyến | ✅ | ✅ | ❌ | ✅ |
| **F29** | Quy trình cận lâm sàng 2 pha | ❌ | ✅ | ✅ | ❌ |
