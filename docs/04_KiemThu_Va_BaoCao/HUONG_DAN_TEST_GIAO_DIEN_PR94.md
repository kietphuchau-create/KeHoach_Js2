# Hướng Dẫn Kiểm Thử Trên Giao Diện (PR #94 — Production Hardening)

Tài liệu này tóm tắt các thao tác kiểm thử trực tiếp trên giao diện Web (`http://localhost:3000`) cho các thay đổi trong nhánh `fix/production-hardening` (PR #94, không thay đổi cấu trúc Database).

---

## 1. Đặt nhiều chuyên khoa trong ngày & Cấp STT tuần tự

**Tài khoản sử dụng:** Bệnh nhân (`PATIENT`)

**Các bước thao tác:**
1. Truy cập `/login` và đăng nhập bằng tài khoản Bệnh nhân.
2. Vào `/booking` → chọn **Bác sĩ A**, ngày khám `D`, khung giờ `08:30` → hoàn tất đặt lịch (**Ca 1**).
3. Quay lại `/booking` → chọn **Bác sĩ B** (khác bác sĩ/chuyên khoa), **cùng ngày `D`**, khung giờ khác (ví dụ `10:00`) → bấm đặt lịch (**Ca 2**).
4. Thử đặt thêm **Ca 3** vào một trong hai trường hợp:
   - Cùng **Bác sĩ A** trong ngày `D`, hoặc
   - **Trùng khung giờ** `08:30` với một bác sĩ khác.
5. Vào `/my-appointments` để kiểm tra danh sách lịch hẹn.

**Kết quả mong đợi:**
- **Ca 1** và **Ca 2** đặt thành công (không còn bị chặn cứng 1 ca/ngày với 2 bác sĩ khác nhau).
- **Ca 3** bị chặn và hiển thị thông báo lỗi trùng bác sĩ trong ngày hoặc trùng giờ khám.
- Số thứ tự tại `/my-appointments` hiển thị tuần tự theo ngày/bác sĩ dạng `APP-001`, `APP-002`... (thay vì 4 chữ số ngẫu nhiên).

---

## 2. Chặn Check-in QR đối với lịch hẹn đã hủy / hoàn tất

**Tài khoản sử dụng:** Bệnh nhân (`PATIENT`) và Lễ tân (`STAFF`)

**Các bước thao tác:**
1. Đăng nhập tài khoản **Bệnh nhân** → vào `/my-appointments` → chọn một lịch hẹn đang chờ và bấm **Hủy lịch** (ghi lại mã đặt lịch `MEDxxxxxx`).
2. Đăng xuất, đăng nhập bằng tài khoản **Lễ tân (`STAFF`)** → vào `/reception`.
3. Tại khu vực **Check-in QR**, nhập hoặc quét mã `MEDxxxxxx` vừa hủy.

**Kết quả mong đợi:**
- Hệ thống từ chối tiếp đón và báo lỗi lịch hẹn đang ở trạng thái `CANCELLED` (không chuyển sang `CHECKED_IN`).

---

## 3. Bảo mật xem & tải PDF đơn thuốc

**Tài khoản sử dụng:** Bệnh nhân A (`PATIENT`), Bệnh nhân B (`PATIENT`), và trình duyệt ẩn danh (chưa đăng nhập)

**Các bước thao tác:**
1. Đăng nhập **Bệnh nhân A** → vào `/my-appointments` → chọn một ca đã hoàn tất khám (`COMPLETED`) → bấm **Xem đơn thuốc / Tải PDF**.
2. Sao chép `appointmentId` của ca khám đó, mở **tab ẩn danh** (chưa đăng nhập) hoặc đăng nhập bằng **Bệnh nhân B**.
3. Dán trực tiếp đường dẫn sau lên thanh địa chỉ trình duyệt:
   - `http://localhost:8080/api/v1/prescriptions/<appointmentId_cua_A>/pdf`

**Kết quả mong đợi:**
- **Bệnh nhân A** xem và tải file PDF đơn thuốc bình thường.
- **Tab ẩn danh** bị chặn `401 Unauthorized`; **Bệnh nhân B** bị chặn `403 Forbidden` (không xem được đơn thuốc của người khác).

---

## 4. Phân quyền nút giả lập thanh toán & Dọn ca quá hạn

**Tài khoản sử dụng:** Bệnh nhân (`PATIENT`) và Quản trị viên (`ADMIN`)

**Các bước thao tác:**
1. Đăng nhập **Bệnh nhân** → thực hiện đặt lịch tại `/booking` đến bước thanh toán QR.
2. Nếu giao diện hiển thị nút **Giả lập webhook ngân hàng (Simulate)**, bấm thử bằng tài khoản Bệnh nhân (hoặc thử bằng tài khoản `ADMIN`).
3. Để một ca `PENDING` (chưa thanh toán) quá **15 phút** để Cron Job tự động hủy, sau đó mở lại ca đó ở `/my-appointments`.

**Kết quả mong đợi:**
- Tài khoản Bệnh nhân bấm Simulate bị từ chối quyền (`403 Forbidden`); chỉ `ADMIN` mới thực hiện được.
- Ca `PENDING` quá 15 phút tự động chuyển sang `CANCELLED` nhưng nội dung **Triệu chứng** của bệnh nhân vẫn giữ nguyên, không bị nối thêm chuỗi `[AUTO-CANCEL]: ...`.
