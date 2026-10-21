# BẢNG GÓP Ý & HƯỚNG DẪN ĐỒNG BỘ CODE (DÀNH CHO HIẾU)

> **Dự án:** MedSched - Hệ Thống Đặt Lịch & Tiếp Đón Khám Bệnh  
> **Người gửi:** Kiệt (Admin / Trưởng nhóm phụ trách Core & Flow)  
> **Nhánh liên quan:** `feature/clab-103-hieu-appointment-booking`  
> **Ngày lập:** 09/10/2026

---

1. **Tích hợp thanh toán tiện ích:**
   - Hoàn thiện luồng VietQR chuẩn ngân hàng (KienlongBank).
   - Bổ sung trang giả lập thanh toán VNPay Mock (`/vnpay-mock`) giúp nhóm dễ demo luồng nộp viện phí/tiền khám.
2. **Số hóa quy trình tiếp đón:**
   - Trang tiếp đón tự phục vụ bằng mã QR (`/checkin`).
   - Modal quét mã trực tiếp qua webcam/camera (`QrCameraScannerModal.tsx`).
3. **Tự động hóa & Khám phá công nghệ mới:**
   - Tự viết tiến trình chạy ngầm `AppointmentCleanupJob` (hủy tự động ca PENDING quá 15 phút hoặc bệnh nhân trễ hẹn quá 15 phút).
   - Thiết lập hẳn một module **MCP Server** (`Source_code/mcp-server`) với 4 tool để tích hợp AI hỗ trợ đặt lịch.
   - Chủ động dựng file pipeline CI/CD (`.github/workflows/ci.yml`) để tự động kiểm thử và build trên GitHub Actions.
4. **Hồ sơ kiểm thử chỉn chu:** Đã soạn thảo đầy đủ Test Cases Excel (`Test_Cases_MedSched_function.xlsx`), Test Plan Word và Bug Report.

---

## ⚠️ 2. Các Lỗi Kỹ Thuật & Vấn Đề Cần Khắc Phục Ngay

### Lỗi 1: Pipeline CI/CD GitHub Actions Bị FAIL (Dấu ❌ Đỏ Trên Commit `2940ee3`)

- **Hiện tượng:** Trên giao diện GitHub của nhánh, cạnh commit mới nhất `2940ee3` có dấu gạch chéo đỏ `❌`, nghĩa là pipeline CI/CD chạy tự động đã bị dừng đột ngột do gặp lỗi.
- **Nguyên nhân chính xác:**
  - Trong file `Source_code/frontend/src/shared/components/QrCameraScannerModal.tsx` (dòng 2), Hiếu có sử dụng thư viện quét mã:
    ```typescript
    import jsQR from "jsqr";
    ```
  - Tuy nhiên, trong file `Source_code/frontend/package.json` **hoàn toàn chưa khai báo cài đặt package `jsqr`** (và `@types/jsqr`).
  - Khi GitHub Actions chạy bước Type-Check:
    ```bash
    pnpm exec tsc --noEmit
    # hoặc pnpm build
    ```
    Trình biên dịch TypeScript báo lỗi `Cannot find module 'jsqr' or its corresponding type declarations` và lập tức đánh **FAIL** toàn bộ quy trình CI.
- **Cách sửa nhanh:**
  Mở terminal tại máy local, di chuyển vào frontend và cài đặt bổ sung:
  ```bash
  cd Source_code/frontend
  pnpm add jsqr
  pnpm add -D @types/jsqr
  pnpm run build
  ```
  _(Đảm bảo lệnh `pnpm run build` chạy thành công 100% không báo lỗi TypeScript/ESLint ở máy mình trước khi push)._

---

### Lỗi 2: Nhánh Bị Lệch Pha Quá Lâu (Gần 1 Tháng) & Nguy Cơ Xung Đột Nghiêm Trọng

- **Nguyên nhân:**
  - Nhánh `feature/clab-103-hieu-appointment-booking` thực tế đã được duyệt và gộp vào `develop` từ trước (PR #3 từ ngày 18/09/2026).
  - Gần 1 tháng qua, nhóm đã phát triển và hoàn thiện rất nhiều module trọng yếu trên `develop`:
    - Bộ UI chuẩn toàn diện (Next.js layout, header, footer, mobile-responsive).
    - Phân quyền Quản trị viên (Admin Catalog, quản lý người dùng, tạo bác sĩ).
    - Phân bổ sơ đồ buồng khám thực tế (**BS. Lê Hoàng Nam phòng `P.102`**, **BS. Huỳnh Quốc Bảo phòng `P.208`**, tránh hoàn toàn xung đột ca trực).
    - Hệ thống Thống kê 100% dữ liệu thực từ MySQL (loại bỏ mock data).
    - Lịch sử tiếp đón & in lại phiếu số thứ tự cho Lễ tân.
    - Cơ chế bảo mật Single-Tab Lock (chống đăng nhập đồng thời làm sai lệch dữ liệu).
- **Hậu quả nếu gộp (merge) thẳng nhánh hiện tại:**
  - Nhánh `clab-103` đang xung đột với `develop` ở **hơn 20 files quan trọng**, đặc biệt là các file bị xung đột nặng dạng `CONFLICT (add/add)` hoặc `CONFLICT (content)`:
    - `Source_code/frontend/src/modules/appointment/components/BookingForm.tsx`
    - `Source_code/frontend/src/modules/appointment/components/MyAppointmentsView.tsx`
    - `Source_code/frontend/src/modules/reception/components/ReceptionView.tsx`
    - `Source_code/frontend/src/shared/lib/api.ts`
    - `Source_code/backend/app/src/main/java/com/medsched/security/SecurityConfig.java`
    - `Source_code/backend/app/src/main/java/com/medsched/app/adapter/in/web/ReceptionController.java`
    - `Source_code/database/medsched_db.sql`
  - Nếu merge đè nhánh này, toàn bộ giao diện và các logic phân phòng, chống xung đột lịch trực của nhóm sẽ bị xóa hoặc đè mất code.

---

### Lỗi 3: Chưa Tuân Thủ Quy Ước Thư Mục Dự Án (File Rác Ở Root)

- Hiện tại có 3 file tài liệu bị đẩy thẳng vào thư mục gốc của repository:
  - `Test_Cases_MedSched_function.xlsx`
  - `Test_Plan_MedSched_function.docx`
  - `bugs_report.docx` (file này có dung lượng lớn **~672 KB**)
- **Quy ước:** Tất cả tài liệu kiểm thử, báo cáo word/excel cần được gom gọn vào thư mục `docs/test/` hoặc `docs/qa/`, tránh để rải rác ngoài root repo làm lộn xộn dự án.

---

### Lỗi 4: Quy Trình Git Flow (Chỉ Đạo Của Thầy Bình)

- Thông báo trên GitHub hiển thị `This branch is 15 commits ahead of main`.
- Theo đúng quy trình nhóm:
  - **`develop`** là nhánh trung tâm duy nhất để tích hợp tính năng. Mọi nhánh feature đều phải tách ra từ `develop` mới nhất và tạo Pull Request gộp ngược lại vào `develop`.
  - Tuyệt đối không commit thẳng hoặc tạo PR vào `main`.

---

## 🛠️ 3. Các Bước Hướng Dẫn Hiếu Phối Hợp Xử Lý & Đồng Bộ

Để giữ nguyên vẹn tất cả các tính năng xịn xò mà Hiếu vừa làm (VietQR, VNPay mock, Check-in QR, MCP server, CI/CD) mà **không làm mất** code của nhóm, Hiếu làm theo quy trình chuẩn sau nhé:

### Bước 1: Khắc phục lỗi thiếu thư viện & dọn file

Tại nhánh hiện tại của Hiếu:

```bash
# 1. Cài đặt thư viện jsqr vào frontend
cd Source_code/frontend
pnpm add jsqr
pnpm add -D @types/jsqr

# 2. Chuyển các file tài liệu test vào thư mục docs
cd ../..
mkdir -p docs/test
mv Test_Cases_MedSched_function.xlsx docs/test/
mv Test_Plan_MedSched_function.docx docs/test/
mv bugs_report.docx docs/test/

# 3. Commit bổ sung
git add Source_code/frontend/package.json Source_code/frontend/pnpm-lock.yaml docs/test/ Test_* bugs_report.docx
git commit -m "fix(ci): bo sung dependency jsqr va chuyen tai lieu test vao docs"
git push origin feature/clab-103-hieu-appointment-booking
```

_(Sau bước này, GitHub Actions CI sẽ chạy lại và chuyển sang màu xanh ✅)._

---

### Bước 2: Tạo Nhánh Mới Chuẩn Git Flow Tách Từ `develop` Mới Nhất

Vì nhánh `clab-103` đã cũ, Hiếu nên tạo nhánh tính năng mới theo đúng chuẩn:

```bash
# Kéo toàn bộ code mới nhất của nhóm về
git checkout develop
git pull origin develop

# Tách nhánh mới dành riêng cho đợt tính năng VietQR & QR Checkin
git checkout -b feature/clab-108-hieu-vietqr-checkin-mcp
```

---

### Bước 3: Gộp Code Mới Vào Nhánh Chuẩn & Xử Lý Conflict

Tại nhánh `feature/clab-108-hieu-vietqr-checkin-mcp`:

```bash
git merge feature/clab-103-hieu-appointment-booking
```

- Khi xảy ra Conflict ở các file giao diện (`BookingForm.tsx`, `ReceptionView.tsx`, `api.ts`), hãy mở VS Code / IDE lên để xem:
  - **Giữ lại:** Các đoạn giao diện mới, sơ đồ buồng khám `P.102/P.208`, và bộ lọc thống kê mới của nhóm trên `develop`.
  - **Ghép thêm:** Modal VietQR, modal quét QR camera, và các endpoint gọi API thanh toán của Hiếu.
- Nếu chỗ nào chưa rõ giữa 2 bên, hú Kiệt để 2 đứa cùng pair-programming giải quyết trong 15-20 phút là xong sạch đẹp!

---

### Bước 4: Kiểm Thử Pre-flight & Mở Pull Request

Sau khi giải quyết xong conflict:

1. **Kiểm tra Backend:**
   ```bash
   cd Source_code/backend
   ./gradlew test
   ```
2. **Kiểm tra Frontend:**
   ```bash
   cd Source_code/frontend
   pnpm run build
   ```
3. **Đẩy lên GitHub và tạo PR vào `develop`:**
   ```bash
   git push -u origin feature/clab-108-hieu-vietqr-checkin-mcp
   ```
   Lên GitHub bấm nút **New Pull Request**:
   - Base branch: **`develop`** (KHÔNG chọn `main`)
   - Compare branch: `feature/clab-108-hieu-vietqr-checkin-mcp`
   - Báo cho Kiệt và nhóm vào review và duyệt merge!

---

_Cảm ơn Hiếu vì đã nỗ lực làm rất nhiều tính năng hay cho MedSched! Làm theo các bước trên là dự án của nhóm sẽ cực kỳ mượt mà và đúng chuẩn của thầy Bình luôn nhé!_
