# 🎨 HƯỚNG DẪN NHẬN TASK CHỈNH SỬA UI DỰ ÁN MEDSCHED
> **Dành riêng cho:** Bạn Trang (UI/UX & Frontend Developer)  
> **Dự án:** MedSched — Hệ thống Quản lý Lịch khám & Phòng khám Đa khoa  
> **Nhánh gốc làm việc:** `develop` (TUYỆT ĐỐI KHÔNG LÀM TRỰC TIẾP TRÊN `main`)  
> **Ngày lập:** 13/10/2026

---

## 📌 1. TỔNG QUAN VÀ MỤC TIÊU CÔNG VIỆC

Nhóm vừa hoàn tất tích hợp và kiểm thử toàn diện các logic nghiệp vụ cốt lõi (**CLAB-124** và **CLAB-125**) trên nhánh trung tâm `develop`:
- Luồng tiếp đón, gọi số hàng đợi thời gian thực và điều phối phòng khám.
- Hệ thống buồng khám bác sĩ, quản lý lịch trực tuần và kê đơn thuốc điện tử.
- Bảng quản trị người dùng phân quyền (Admin) và báo cáo thống kê chuyên khoa.

👉 **Mục tiêu của bạn Trang:**  
Lấy mã nguồn và cơ sở dữ liệu mới nhất từ nhánh `develop` về máy, tiến hành **tân trang, tối ưu hóa thẩm mỹ giao diện (UI/UX)**, tăng tính thẩm mỹ hiện đại, căn chỉnh khoảng cách, font chữ, màu sắc, responsive và micro-interactions cho các màn hình theo phân công, sau đó mở **Pull Request (PR)** ngược lại vào nhánh `develop`.

---

## 🚀 2. BƯỚC 1: ĐỒNG BỘ MÃ NGUỒN VÀ TẠO NHÁNH MỚI

Mở Terminal (Git Bash / PowerShell / Command Prompt) tại thư mục gốc của dự án `DuAnChinhThuc`:

```bash
# 1. Chuyển về nhánh develop trung tâm của nhóm
git checkout develop

# 2. Kéo code mới nhất từ GitHub về
git pull origin develop

# 3. Tạo nhánh tính năng riêng cho bạn (Tuân thủ chuẩn Git Flow của nhóm)
git checkout -b feature/clab-126-trang-refactor-ui
```

> [!IMPORTANT]
> **Quy ước đặt tên nhánh bắt buộc:**  
> Cú pháp: `feature/clab-<mã ticket>-<mô tả ngắn>`  
> Ví dụ: `feature/clab-126-trang-refactor-ui` hoặc `feature/clab-126-ui-doctor-portal`  
> *(Dùng chữ thường không dấu, ngăn cách bằng dấu gạch ngang `-`, không dùng khoảng trắng)*.

---

## 🗄️ 3. BƯỚC 2: CẬP NHẬT CƠ SỞ DỮ LIỆU (DATABASE) & KHỞI CHẠY BACKEND

### A. Cập nhật Database MySQL cục bộ (XAMPP / MySQL Workbench)
1. Nhánh `develop` đã chứa file CSDL mới nhất tại:  
   👉 `Source_code/database/medsched_db.sql`
2. Mở **phpMyAdmin** (hoặc MySQL Workbench), chọn database `medsched_db` và bấm **Import** (Nhập) lại file `medsched_db.sql` này để đảm bảo có đầy đủ dữ liệu mẫu bác sĩ, buồng khám và tài khoản kiểm thử mới nhất.

### B. Khởi chạy Backend Spring Boot (Port 8080)
Mở cửa sổ Terminal thứ nhất:
```bash
cd Source_code/backend
./gradlew bootRun
# Hoặc trên Windows PowerShell: .\gradlew.bat bootRun
```
*Backend chạy thành công khi xuất hiện thông báo: `Tomcat started on port 8080 (http)`.*

### C. Tài khoản mẫu kiểm thử giao diện theo từng phân quyền
| Phân quyền | Email | Mật khẩu | Chức năng kiểm thử |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@medsched.com` | `admin123` | Quản trị tài khoản, danh mục chi nhánh, khoa phòng |
| **Bác sĩ (Doctor)** | `doctor1@medsched.com` | `doctor123` | Buồng khám `/doctor`, lịch trực `/doctor/schedule` |
| **Lễ tân (Reception)** | `reception1@medsched.com` | `reception123` | Quầy tiếp đón, check-in QR, cấp số chờ |
| **Bệnh nhân (Patient)** | `patient1@medsched.com` | `patient123` | Đặt lịch hẹn trực tuyến, xem đơn thuốc |

---

## 💻 4. BƯỚC 3: CÀI ĐẶT & KHỞI CHẠY FRONTEND NEXT.JS (Port 3000)

Mở cửa sổ Terminal thứ hai:
```bash
# 1. Di chuyển vào thư mục frontend
cd Source_code/frontend

# 2. Cài đặt các thư viện cần thiết (khuyến khích dùng pnpm)
pnpm install
# (Nếu máy bạn chưa cài pnpm, có thể dùng: npm install)

# 3. Chạy giao diện ở môi trường Development
pnpm run dev
# (Hoặc: npm run dev)
```

Mở trình duyệt truy cập:  
🌐 **`http://localhost:3000`**

---

## 🎯 5. BƯỚC 4: BẢN ĐỒ CÁC MÀN HÌNH & LƯU Ý KHI CHỈNH SỬA UI

### A. Cấu trúc thư mục mã nguồn Frontend
- **Giao diện Bác Sĩ:**
  - `Source_code/frontend/src/modules/doctor/components/DoctorClinicView.tsx`: Trang buồng khám lâm sàng (`/doctor`).
  - `Source_code/frontend/src/modules/doctor/components/DoctorScheduleView.tsx`: Trang quản lý lịch trực tuần (`/doctor/schedule`).
- **Giao diện Quản Trị (Admin):**
  - `Source_code/frontend/src/modules/admin/components/UserTable.tsx`: Bảng quản lý người dùng và bộ lọc tìm kiếm (`/admin`).
  - `Source_code/frontend/src/modules/admin/components/CatalogManager.tsx`: Danh mục chi nhánh, chuyên khoa (`/admin/catalog`).
  - `Source_code/frontend/src/app/admin/create-user/page.tsx`: Form thêm mới nhân viên/bác sĩ.
- **Giao diện Thống Kê (Statistics):**
  - `Source_code/frontend/src/modules/statistics/components/BreakdownTable.tsx`: Bảng phân bổ ca khám & doanh thu theo bác sĩ.
- **Giao diện Đặt Lịch & Tiếp Đón:**
  - `Source_code/frontend/src/modules/appointment/components/BookingForm.tsx`: Form đặt lịch khám người bệnh.
  - `Source_code/frontend/src/shared/components/HeaderNav/HeaderNav.tsx`: Thanh điều hướng đầu trang.

---

### B. NGUYÊN TẮC VÀNG KHI CHỈNH SỬA UI (ĐẶC BIỆT CHÚ Ý)

> [!WARNING]
> 1. **GIỮ NGUYÊN TOÀN BỘ LOGIC NGHIỆP VỤ & API:**
>    - Tuyệt đối **không xóa** hoặc **sửa đổi** logic của các hàm `useEffect`, `useState`, các hàm gọi API (`api.getDoctorQueue()`, `api.completeConsultation()`, v.v.).
>    - Không đổi tên biến state hoặc các thuộc tính data binding quan trọng.
>
> 2. **QUY TẮC BUỒNG KHÁM BÁC SĨ (VỪA HOÀN THIỆN Ở CLAB-125):**
>    - Tại giao diện buồng khám `/doctor`, **KHÔNG ĐƯỢC thêm lại nút [Đổi phòng]**.
>    - Theo quy định y tế của phòng khám: Bác sĩ chỉ được phép chọn hoặc đổi buồng khám khi đăng ký ca trực cho ngày tiếp theo (ở trang `/doctor/schedule` trước 00:00:00).
>
> 3. **TIỆN ÍCH NGOÀI (FloatingWidgets - Zalo, Hotline):**
>    - Đã được tự động ẩn trên các trang nghiệp vụ nội bộ (`/doctor`, `/admin`, `/reception`) để không che khuất bảng điều khiển. Giữ nguyên cài đặt này.
>
> 4. **HỆ THỐNG MÀU SẮC & PHONG CÁCH CHUẨN CỦA MEDSCHED:**
>    - **Màu chủ đạo (Primary):** Teal / Emerald (`teal-700`, `teal-800`, `emerald-600`) — tượng trưng cho sự tin cậy, y tế và sức khỏe.
>    - **Màu nền (Background):** Slate dịu mắt (`bg-slate-50`, `bg-slate-100`, card `bg-white`).
>    - **Border & Shadow:** Viền mỏng mềm mại (`border-slate-200`, `rounded-2xl`, `rounded-3xl`, `shadow-xs`, `shadow-2xs`).
>    - **Responsive:** Đảm bảo co giãn tốt trên cả Desktop (1920px, 1440px), Laptop (1280px) và Tablet/Mobile.

---

## 🔍 6. BƯỚC 5: KIỂM TRA BẮT BUỘC TRƯỚC KHI COMMIT (PRE-FLIGHT CHECK)

Trước khi commit mã nguồn, bạn Trang hãy chạy các lệnh kiểm tra sau tại thư mục `Source_code/frontend`:

```bash
# 1. Kiểm tra lỗi kiểu dữ liệu TypeScript (BẮT BUỘC ĐẠT 0 LỖI)
pnpm exec tsc --noEmit
# (Hoặc: npx tsc --noEmit)

# 2. Thử build dự án Next.js để đảm bảo không lỗi cú pháp hoặc thẻ đóng/mở HTML
pnpm run build
```

Nếu cả 2 lệnh trên đều chạy thành công xanh mướt (Exit code 0), bạn đã sẵn sàng đóng gói commit!

---

## 📦 7. BƯỚC 6: COMMIT VÀ ĐẨY CODE LÊN GITHUB

Tuân thủ chuẩn **Conventional Commits** của nhóm:

```bash
# 1. Kiểm tra danh sách file đã thay đổi (chỉ commit file bạn sửa)
git status

# 2. Thêm file vào vùng chờ commit
git add Source_code/frontend/src/...

# 3. Tạo commit với thông điệp rõ ràng
git commit -m "feat(ui): nang cap giao dien buong kham bac si va toi uu responsive"

# 4. Đẩy nhánh của bạn lên GitHub
git push -u origin feature/clab-126-trang-refactor-ui
```

---

## 🔀 8. BƯỚC 7: MỞ PULL REQUEST (PR) VÀO NHÁNH `develop`

Sau khi `git push` thành công:
1. Mở trình duyệt truy cập kho GitHub dự án:  
   👉 **[https://github.com/kietphuchau-create/KeHoach_Js2](https://github.com/kietphuchau-create/KeHoach_Js2)**
2. Nhấn vào nút **"Compare & pull request"** (hoặc tab **Pull requests** ➔ **New pull request**).
3. **CẤU HÌNH NHÁNH QUAN TRỌNG:**
   - **Base (nhánh đích):** Chọn **`develop`** *(⚠️ TUYỆT ĐỐI KHÔNG CHỌN `main`)*.
   - **Compare (nhánh nguồn):** Chọn **`feature/clab-126-trang-refactor-ui`**.
4. **Tiêu đề PR:**  
   `feat(ui): nâng cấp giao diện toàn diện các module frontend [CLAB-126]`
5. **Nội dung mô tả PR:** Sao chép mẫu bên dưới và điền vào:

```markdown
## Tóm tắt
PR này cải tiến và chuẩn hóa toàn diện giao diện người dùng (UI/UX) cho các màn hình theo phân công, tăng tính thẩm mỹ hiện đại, responsive và trải nghiệm người dùng.

## Thay đổi chính
- Căn chỉnh bảng màu, typography và khoảng cách padding/margin theo chuẩn MedSched.
- Cải thiện hiển thị responsive trên các kích thước màn hình nhỏ.
- Giữ nguyên toàn bộ logic gọi API và ràng buộc nghiệp vụ phòng khám.

## Đã kiểm thử thế nào
- [x] Chạy TypeScript check (`pnpm exec tsc --noEmit`) đạt 0 lỗi.
- [x] Chạy `pnpm run build` thành công.
- [x] Đã kiểm tra trực quan trên trình duyệt ở Desktop và Mobile.

## Checklist
- [x] Tách nhánh và mở PR vào nhánh `develop` (KHÔNG phải `main`)
- [x] Tên nhánh đúng chuẩn `feature/clab-126-...`
- [x] Không commit file rác, file `.env` hay mật khẩu cá nhân
```

6. Nhấn nút xanh **"Create pull request"** và thông báo lên nhóm Zalo để Trưởng nhóm/Reviewer vào kiểm tra và Merge vào `develop`.

---

## 💡 9. KHẮC PHỤC SỰ CỐ THƯỜNG GẶP (FAQ / TROUBLESHOOTING)

1. **Hỏi: Khi `git pull` bị xung đột (conflict) thì làm sao?**  
   - *Trả lời:* Đảm bảo bạn đang commit mã nguồn dở dang trước (`git stash` hoặc commit nhánh riêng), sau đó chuyển về `develop` và `git pull origin develop`. Khi tạo nhánh mới từ `develop` sạch, bạn sẽ không bao giờ bị conflict.
2. **Hỏi: Bị lỗi `Port 3000 is in use`?**  
   - *Trả lời:* Có thể tab terminal cũ đang chạy ngầm dev server. Tắt tab terminal cũ hoặc chạy `npx kill-port 3000` rồi `pnpm run dev` lại.
3. **Hỏi: Có cần sửa gì trong thư mục `Source_code/backend` không?**  
   - *Trả lời:* Bạn Trang chỉ cần tập trung làm đẹp thư mục `Source_code/frontend`. Không cần sửa đổi code Backend.
4. **Hỏi: Không đăng nhập được vào giao diện?**  
   - *Trả lời:* Kiểm tra xem Backend Spring Boot đã bật ở port 8080 chưa, và đảm bảo đã import file `Source_code/database/medsched_db.sql` vào MySQL.

---
*Chúc bạn Trang thực hiện task thuận lợi! Nếu có bất kỳ câu hỏi nào về luồng nghiệp vụ, hãy liên hệ ngay với Trưởng nhóm hoặc Backend dev nhé.*
