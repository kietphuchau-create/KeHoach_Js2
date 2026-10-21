# BÁO CÁO NGHIỆP VỤ: QUY ĐỊNH KHÓA ĐỔI BUỒNG KHÁM KHI BẮT ĐẦU NGÀY MỚI (CLAB-113)

- **Người thực hiện:** Châu Tuấn Kiệt (Team Leader)
- **Dự án:** MedSched - Hệ Thống Quản Lý Lịch Khám & Xếp Lịch Phòng Khám
- **Nhánh Feature:** `feature/clab-113-lock-room-change-on-day-of-visit` -> `develop`
- **Mã Ticket:** `CLAB-113`
- **Ngày hoàn thành:** 12/10/2026

---

## 1. Bối Cảnh & Đặt Vấn Đề

Trong môi trường phòng khám và bệnh viện đa khoa:
1. **Người bệnh đã có phiếu hẹn / mã đặt chỗ:**
   Khi người bệnh đặt lịch hẹn khám qua website hoặc ứng dụng, phiếu hẹn đã hiển thị rõ số phòng (ví dụ: `P.208 - Khu Khám Chuyên Khoa, Tầng 2`).
2. **Hệ thống màn hình LCD & Loa gọi số tiếp đón:**
   Mỗi buồng khám được trang bị một màn hình gọi số ngoài cửa phòng và đồng bộ với hệ thống tiếp đón của Lễ tân.
3. **Điều dưỡng, trang thiết bị y tế & hồ sơ bệnh án:**
   Điều dưỡng phụ trách và các thiết bị chuyên môn (máy soi, dụng cụ khám, máy in phiếu...) đã được chuẩn bị sẵn tại đúng buồng khám được phân công từ trước.

### ⚠️ Rủi ro nghiêm trọng nếu cho phép Bác sĩ đổi buồng khám trong ngày khám:
- Bệnh nhân đến quầy tiếp đón được hướng dẫn tới P.208, nhưng Bác sĩ lại tự ý chuyển sang P.101 -> **Bệnh nhân bị lạc, chờ đợi nhầm cửa phòng, bức xúc khiếu nại**.
- Màn hình gọi số LCD ngoài phòng P.208 trống hoặc sai thông tin Bác sĩ đang trực.
- Lễ tân không nắm kịp sự thay đổi để điều phối khách vãng lai (walk-in).

---

## 2. Quy Tắc Nghiệp Vụ Chính Thức (CLAB-113)

> **"Bác sĩ chỉ được phép lựa chọn hoặc đổi buồng khám trước tối thiểu 1 ngày (trước 00:00:00). Khi bước sang ngày khám mới, buồng khám bị KHÓA CỐ ĐỊNH (Read-Only) tuyệt đối."**

### Chi tiết ràng buộc logic:
| Thời điểm thao tác | Trạng thái buồng khám | Hành động hệ thống |
| :--- | :--- | :--- |
| **Trước ngày khám** (`workDate > today`, tức trước 00:00:00) | **Khả dụng (Được đổi)** | Cho phép Bác sĩ đổi sang buồng khám khác thuộc danh mục `APPROVED_CLINIC_ROOMS` (có kiểm tra xung đột thời gian thực với bác sĩ khác). |
| **Bắt đầu ngày khám** (`workDate == today`, tức từ 00:00:00 trở đi) | **KHÓA CỐ ĐỊNH 🔒** | **Từ chối 100% mọi yêu cầu đổi buồng khám**. Backend ném ngoại lệ rõ ràng, Frontend hiển thị huy hiệu `🔒 Đã chốt hôm nay` và khóa thao tác. |
| **Ngày trong quá khứ** (`workDate < today`) | **Đã hoàn tất (Read-Only)** | Không cho phép chỉnh sửa. |

---

## 3. Kiến Trúc Triển Khai

### 3.1. Backend (Spring Boot 3 / Java 17)

1. **DTOs (`DoctorScheduleDtos.java`):**
   - Bổ sung record `ChangeScheduleRoomRequest(@NotBlank String newRoomNumber)`.

2. **Dịch vụ (`DoctorScheduleService.java`):**
   - Thêm phương thức `changeScheduleRoom(String userId, String scheduleId, ChangeScheduleRoomRequest request)`.
   - **Ràng buộc thời gian:**
     ```java
     LocalDate today = LocalDate.now(VN_ZONE);
     if (!schedule.getWorkDate().isAfter(today)) {
         throw new IllegalArgumentException(
             String.format("Theo quy định phòng khám, Bác sĩ chỉ được đổi buồng khám trước tối thiểu 1 ngày (trước 00:00:00). " +
                           "Khi bước sang ngày khám mới (ngày: %s), buồng khám đã được chốt và đồng bộ với phiếu hẹn/màn hình gọi số của người bệnh.",
                           schedule.getWorkDate())
         );
     }
     ```
   - **Ràng buộc quyền sở hữu:** Bác sĩ chỉ có quyền đổi buồng khám của chính ca trực mình đăng ký.
   - **Ràng buộc danh mục phòng:** Phòng mới phải thuộc danh mục được Admin phê duyệt (`APPROVED_CLINIC_ROOMS`: `P.101`, `P.102`, `P.205`, `P.208`, `P.209`).
   - **Ràng buộc chống xung đột phòng:** Quét toàn bộ ca trực trong ngày xem có Bác sĩ khác đang trực tại buồng khám đó trong cùng khung giờ hay không.

3. **REST Controller (`DoctorController.java`):**
   - Thêm endpoint `PATCH /api/v1/doctor/schedules/{scheduleId}/change-room`.

4. **Kiểm thử tự động (`DoctorScheduleServiceTest.java`):**
   - `givenScheduleToday_whenChangeScheduleRoom_thenThrowsIllegalArgumentException`: Xác nhận chặn đổi phòng khi ca trực là ngày hôm nay.
   - `givenScheduleTomorrow_whenChangeScheduleRoom_thenSuccess`: Xác nhận đổi buồng khám thành công khi thực hiện trước 1 ngày.

### 3.2. Frontend (Next.js / TypeScript / Tailwind CSS)

1. **API Client (`api.ts`):**
   - Bổ sung hàm `changeDoctorScheduleRoom(scheduleId: string, newRoomNumber: string)`.

2. **Giao diện Quản lý Lịch trực (`DoctorScheduleView.tsx`):**
   - **Trực quan hóa trạng thái phòng:**
     - **Hôm nay (`isToday`):** Hiển thị huy hiệu màu hổ phách nổi bật:
       `🔒 Phòng P.208 • Đã chốt hôm nay` kèm tooltip giải thích quy định.
     - **Ngày mai trở đi (`isFuture`):** Hiển thị nút `[Đổi buồng]` cho phép mở modal đổi phòng.
     - **Quá khứ (`isPast`):** Hiển thị phòng màu xám đã qua.
   - **Modal Đổi Buồng Khám (`showChangeRoomModal`):**
     - Cho phép chọn buồng khám từ danh sách phê duyệt.
     - Tự động gọi API `checkOccupancy` thời gian thực để làm mờ/cảnh báo các phòng đã có bác sĩ khác trực trùng giờ.
     - Hiển thị bảng giải thích quy tắc 00:00:00 của phòng khám.
   - **Modal Đăng Ký Ca Mới:**
     - Hiển thị hộp thông tin màu xanh hướng dẫn quy định khóa phòng khi bước sang ngày mới.

---

## 4. Kết Quả Kiểm Thử & Biên Dịch

1. **Backend Unit Tests:**
   ```bash
   ./gradlew.bat test
   ```
   - Kết quả: **BUILD SUCCESSFUL in 30s** (100% tests passed, bao gồm 2 test case mới cho CLAB-113).

2. **Frontend Type-check:**
   ```bash
   pnpm exec tsc --noEmit
   ```
   - Kết quả: **0 errors**, biên dịch hoàn hảo.

3. **Backend Compile:**
   ```bash
   ./gradlew.bat compileJava
   ```
   - Kết quả: **BUILD SUCCESSFUL in 7s**.

---

## 5. Kết Luận
Tính năng khóa đổi buồng khám khi bước sang ngày mới đã được hoàn thiện đúng chuẩn quy trình bệnh viện, bảo đảm tính toàn vẹn dữ liệu giữa Lễ tân, Bác sĩ và Người bệnh.
