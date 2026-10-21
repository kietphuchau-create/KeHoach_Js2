# 📑 PHÂN TÍCH KHUYẾT ĐIỂM NGHIỆP VỤ: XUNG ĐỘT BUỒNG KHÁM GIỮA CÁC BÁC SĨ
**Mã phân tích:** `DEFECT-ROOM-CONFLICT-01`  
**Dự án:** MedSched - Hệ Thống Đặt Lịch & Điều Phối Khám Bệnh Thông Minh  
**Phân hệ:** Buồng Khám Bác Sĩ (Doctor Console) & Xếp Lịch Trực (Schedule Management)  
**Phân loại theo tiêu chí giảng viên (Thầy Bình):** *Luồng Không Lý Tưởng (Unhappy Path / Edge Case / Resource Contention)*  

---

## 1. MÔ TẢ KHUYẾT ĐIỂM (PROBLEM STATEMENT)

### 1.1. Hiện trạng trong mã nguồn hiện tại
Trong phương thức `createSchedule` tại file [`DoctorScheduleService.java`](file:///d:/MonHocITC/Javaspring2/DuAnChinhThuc/Source_code/backend/app/src/main/java/com/medsched/doctor/DoctorScheduleService.java):
* Hệ thống **đã kiểm tra** chống trùng lặp ca trực trên **chính bản thân một Bác sĩ** (`findByDoctorIdAndWorkDate`): một bác sĩ không thể đăng ký 2 ca đè giờ lên nhau.
* **KHUYẾT ĐIỂM:** Hệ thống **chưa kiểm tra ràng buộc chéo giữa hai Bác sĩ khác nhau** về tài nguyên buồng khám (`room_number`).
  * Ví dụ: Bác sĩ A (PGS.TS Trần Văn Hùng) đăng ký trực tại **Phòng P.208** từ `08:00 – 12:00` ngày `10/10/2026`.
  * Bác sĩ B (BS.CKII Nguyễn Minh Anh) sau đó cũng vào hệ thống và đăng ký trực tại **Phòng P.208** từ `08:00 – 12:00` (hoặc `09:00 – 11:30`) cùng ngày.
  * Hiện tại Backend **vẫn cho phép lưu cả 2 ca trực này** nếu chưa có kiểm tra phòng trùng lặp giữa các bác sĩ.

---

## 2. HẬU QUẢ VÀ RỦI RO NGHIỆP VỤ Y TẾ THỰC TẾ

Nếu khuyết điểm này không được xử lý chặt chẽ, các hậu quả nghiêm trọng sau sẽ xảy ra trong vận hành phòng khám:

| STT | Rủi ro thực tế | Mức độ nghiêm trọng | Mô tả chi tiết |
| :---: | :--- | :---: | :--- |
| **1** | **Xung đột cơ sở vật chất (Physical Conflict)** | 🔴 **Nghiêm trọng (Critical)** | Một buồng khám chỉ có **1 bàn khám, 1 ghế bác sĩ, 1 giường khám lâm sàng**. Hai bác sĩ không thể cùng ngồi khám và hỏi bệnh hai bệnh nhân khác nhau trong cùng một không gian kín. |
| **2** | **Vỡ trận phòng chờ & Cửa phòng khám** | 🔴 **Nghiêm trọng (Critical)** | Bệnh nhân đặt lịch của cả Bác sĩ A và Bác sĩ B đều nhận được thông báo tập trung tại Cửa buồng `P.208`, gây ùn ứ, tranh cãi và chen lấn trước cửa phòng khám. |
| **3** | **Loạn hệ thống điều phối & Màn hình TV** | 🟠 **Cao (High)** | Màn hình Kiosk hiển thị số thứ tự tại cửa phòng `P.208` sẽ bị xung đột tín hiệu gọi số giữa 2 bác sĩ, loa gọi bệnh nhân phát đè nhau. |
| **4** | **Xung đột trách nhiệm y khoa & Kê đơn** | 🟠 **Cao (High)** | Khi xảy ra sự cố chuyên môn hoặc sai sót đơn thuốc, việc xác định phiên làm việc và trách nhiệm sử dụng phòng/vật tư y tế gặp nhiều vướng mắc pháp lý. |

---

## 3. QUY TẮC ĐÚNG VỀ PHÂN BỔ BUỒNG KHÁM (BUSINESS RULES)

### 3.1. Nguyên tắc cốt lõi: Một Phòng - Một Bác Sĩ Tại Một Thời Điểm
$$\text{Buồng Khám } R \text{ tại ngày } D \text{ trong khoảng } [T_{\text{start}}, T_{\text{end}}] \implies \text{Duy nhất } 1 \text{ Bác Sĩ trực}$$

### 3.2. Khi nào Bác sĩ khác ĐƯỢC PHÉP và KHÔNG ĐƯỢC PHÉP đăng ký?
* ❌ **KHÔNG ĐƯỢC PHÉP:** Trùng Ngày + Trùng Phòng + Chồng lấn thời gian (`Overlap: Start < ExEnd && End > ExStart`).
* ✅ **ĐƯỢC PHÉP - Cùng Giờ Khác Phòng:** Bác sĩ A trực `P.208` (8h–12h), Bác sĩ B trực `P.205` hoặc `P.101` (8h–12h).
* ✅ **ĐƯỢC PHÉP - Cùng Phòng Khác Ca (Đổi ca tiếp quản):** Bác sĩ A trực Ca Sáng `P.208` (8h–12h), Bác sĩ B tiếp quản trực Ca Chiều `P.208` (13h30–17h).

---

## 4. GIẢI PHÁP KỸ THUẬT TOÀN DIỆN (PROPOSED ARCHITECTURE FIX)

### 4.1. Tầng Cơ Sở Dữ Liệu & Entity
* Bổ sung cột `room_number VARCHAR(50)` trực tiếp vào bảng `doctor_schedules` (hoặc truy vấn qua quan hệ `doctors.room_number`) để xác định chính xác ca trực đó diễn ra tại buồng nào.

### 4.2. Tầng Backend Service ([`DoctorScheduleService.java`](file:///d:/MonHocITC/Javaspring2/DuAnChinhThuc/Source_code/backend/app/src/main/java/com/medsched/doctor/DoctorScheduleService.java))
Thêm bước kiểm tra xung đột phòng trước khi `doctorScheduleRepository.save(schedule)`:

```java
// 1. Lấy thông tin phòng của bác sĩ đang đăng ký
String requestedRoom = request.roomNumber() != null ? request.roomNumber() : currentDoctor.getRoomNumber();

// 2. Tìm tất cả các ca trực đã có trong ngày của TẤT CẢ bác sĩ tại phòng này
List<DoctorScheduleEntity> roomSchedulesInDate = doctorScheduleRepository.findActiveSchedulesByRoomAndDate(
        requestedRoom, request.workDate()
);

// 3. Kiểm tra chồng chéo khung giờ với bác sĩ khác
for (DoctorScheduleEntity existing : roomSchedulesInDate) {
    if (!existing.getDoctorId().equals(targetDoctorId)) { // Khác bác sĩ
        boolean isOverlapping = !request.endTime().isBefore(existing.getStartTime()) 
                             && !request.startTime().isAfter(existing.getEndTime());
        if (isOverlapping) {
            String occupiedDoctorName = doctorRepository.findById(existing.getDoctorId())
                    .map(DoctorEntity::getFullName).orElse("Bác sĩ khác");
            throw new IllegalArgumentException(
                String.format("Buồng khám [%s] đã được %s đăng ký trực khung giờ (%s - %s) ngày %s. " +
                              "Vui lòng chọn buồng khám khác (P.101, P.205, P.209...) hoặc khung giờ khác!",
                              requestedRoom, occupiedDoctorName, 
                              existing.getStartTime(), existing.getEndTime(), request.workDate())
            );
        }
    }
}
```

### 4.3. Tầng Giao Diện Người Dùng Frontend ([`DoctorScheduleView.tsx`](file:///d:/MonHocITC/Javaspring2/DuAnChinhThuc/Source_code/frontend/src/modules/doctor/components/DoctorScheduleView.tsx))
* Trong Modal Đăng Ký Ca Trực, khi Bác sĩ chọn ngày làm việc và giờ trực:
  * Dropdown danh sách phòng tự động kiểm tra và gắn nhãn:
    * `P.208 - Phòng Khám Nội (ĐÃ KÍN LỊCH 8h - 12h)` $\rightarrow$ **Vô hiệu hóa (Disabled)**.
    * `P.205 - Phòng Khám Tim Mạch (Còn trống)` $\rightarrow$ Cho phép chọn.
  * Nếu người dùng vẫn cố chọn phòng đã có người, hiển thị banner cảnh báo đỏ ngay trên Form trước khi submit.

---

## 5. MA TRẬN KỊCH BẢN KIỂM THỬ (TEST CASE MATRIX)

| Mã Test | Kịch bản kiểm thử | Dữ liệu đầu vào | Kết quả mong đợi | Trạng thái hiện tại |
| :---: | :--- | :--- | :--- | :---: |
| **TC-01** | Bác sĩ A đăng ký ca sáng tại P.208 | Ngày: `10/10/2026`, Giờ: `08:00 - 12:00`, Phòng: `P.208` | Đăng ký thành công, sinh 8 slots | ✅ Đã Pass |
| **TC-02** | Bác sĩ A cố đăng ký tiếp ca thứ 2 đè giờ | Cùng BS A, Ngày: `10/10/2026`, Giờ: `09:00 - 11:00` | Chặn lại: Trùng ca trực của chính mình | ✅ Đã Pass |
| **TC-03** | Bác sĩ B đăng ký trùng giờ trùng phòng P.208 | BS B, Ngày: `10/10/2026`, Giờ: `08:30 - 11:30`, Phòng: `P.208` | **Bắt buộc chặn:** Báo lỗi phòng đã có BS A trực | ⚠️ **Cần bổ sung validation** |
| **TC-04** | Bác sĩ B đăng ký cùng giờ nhưng KHÁC phòng | BS B, Ngày: `10/10/2026`, Giờ: `08:00 - 12:00`, Phòng: `P.205` | Thành công 100% | ✅ Đã Pass |
| **TC-05** | Bác sĩ B đăng ký cùng phòng P.208 nhưng KHÁC ca | BS B, Ngày: `10/10/2026`, Giờ: `13:30 - 17:00`, Phòng: `P.208` | Thành công 100% (Tiếp quản ca chiều) | ✅ Đã Pass |

---

## 6. ĐÁNH GIÁ Ý NGHĨA KHI BÁO CÁO VỚI THẦY BÌNH
Việc nhóm chủ động phát hiện và đưa khuyết điểm này vào danh mục kiểm soát chứng minh:
1. **Tư duy kiểm thử chuyên sâu (Critical Thinking):** Không chỉ hài lòng với Happy Path mà nhìn thấy trước các lỗi xung đột tài nguyên đồng thời (Race Condition / Resource Contention).
2. **Chuẩn chỉnh theo tiêu chí của thầy:** Đáp ứng trực tiếp yêu cầu *"Làm những luồng ko lý tưởng"* của thầy Bình trong buổi nghiệm thu dự án.
