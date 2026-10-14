# 🎨 HƯỚNG DẪN NHẬN TASK CHỈNH SỬA UI & DANH MỤC 21 GIAO DIỆN DỰ ÁN MEDSCHED
> **Dành riêng cho:** Bạn Trang (UI/UX & Frontend Developer)  
> **Dự án:** MedSched — Hệ thống Quản lý Lịch khám & Phòng khám Đa khoa Thông minh  
> **Nhánh gốc làm việc:** `develop` (TUYỆT ĐỐI KHÔNG LÀM TRỰC TIẾP TRÊN `main`)  
> **Cập nhật ngày:** 14/10/2026

---

## 📌 1. TỔNG QUAN VÀ MỤC TIÊU CÔNG VIỆC

Nhóm đã hoàn thành tích hợp và kiểm thử toàn diện toàn bộ logic nghiệp vụ cốt lõi (**CLAB-124**, **CLAB-125**, **CLAB-127** và **CLAB-128**) trên nhánh trung tâm `develop`:
- Luồng tiếp đón, gọi số hàng đợi thời gian thực và điều phối phòng khám.
- Hệ thống buồng khám bác sĩ, quản lý lịch trực tuần và kê đơn thuốc điện tử.
- Bảng quản trị người dùng phân quyền (Admin) và báo cáo thống kê chuyên khoa.
- Hiển thị thông tin `Phiên bản v1.0.0` ngay dưới logo thương hiệu MedSched trên thanh Header.

👉 **Mục tiêu của bạn Trang:**  
Lấy mã nguồn và cơ sở dữ liệu mới nhất từ nhánh `develop` về máy, tiến hành **tân trang, tối ưu hóa thẩm mỹ toàn bộ 21 giao diện (UI/UX)**, căn chỉnh khoảng cách, font chữ, màu sắc, responsive co giãn đa màn hình và hiệu ứng tương tác mượt mà (micro-interactions), sau đó mở **Pull Request (PR)** ngược lại vào nhánh `develop`.

---

## 🚀 2. BƯỚC 1: ĐỒNG BỘ MÃ NGUỒN VÀ TẠO NHÁNH MỚI

Mở Terminal (Git Bash / PowerShell / Command Prompt) tại thư mục dự án `DuAnChinhThuc`:

```bash
# 1. Chuyển về nhánh develop trung tâm của nhóm
git checkout develop

# 2. Kéo code mới nhất từ GitHub về
git pull origin develop

# 3. Tạo nhánh tính năng riêng cho bạn (Tuân thủ chuẩn Git Flow của nhóm)
git checkout -b feature/clab-129-trang-refactor-all-ui
```

> [!IMPORTANT]
> **Quy ước đặt tên nhánh bắt buộc:**  
> Cú pháp: `feature/clab-<mã ticket>-<mô tả ngắn>`  
> Ví dụ: `feature/clab-129-trang-refactor-all-ui`  
> *(Dùng chữ thường không dấu, ngăn cách bằng dấu gạch ngang `-`, không dùng khoảng trắng)*.

---

## 🗄️ 3. BƯỚC 2: CẬP NHẬT CƠ SỞ DỮ LIỆU (DATABASE) & KHỞI CHẠY BACKEND

### A. Cập nhật Database MySQL cục bộ (XAMPP / MySQL Workbench)
1. File CSDL mới nhất nằm tại:  
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

## 🗺️ 5. BẢNG KÊ CHI TIẾT 21 GIAO DIỆN (UI INVENTORY) CỦA DỰ ÁN

Dự án MedSched hiện có chính xác **21 màn hình / giao diện** được định tuyến độc lập, phân chia thành **6 phân hệ nghiệp vụ**:

### 🏥 Phân Hệ 1: Bệnh Nhân & Khách Vãng Lai (5 Giao Diện)

| STT | Tên Giao Diện | Route URL | Đường Dẫn File Mã Nguồn Chính | Phân Quyền | Nhiệm Vụ & Điểm Cần Tối Ưu UI/UX |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **1** | **Trang Chủ** | `/` | `src/app/page.tsx` | Mọi người | Hero Banner ấn tượng, khối Về MedSched, danh sách chuyên khoa, quy trình khám bệnh trực quan, footer đầy đủ thông tin. |
| **2** | **Đặt Lịch Khám** | `/booking` | `src/app/booking/page.tsx`<br>`src/modules/appointment/components/BookingForm.tsx` | Khách / Bệnh nhân | Form đặt lịch nhiều bước (Step Wizard): Chọn chuyên khoa ➔ Bác sĩ ➔ Ngày khám ➔ Giờ khám ➔ Thông tin bệnh nhân ➔ Xác nhận. Cần căn lề mềm mại, card bác sĩ nổi bật. |
| **3** | **Kiosk Check-in QR** | `/checkin` | `src/app/checkin/page.tsx`<br>`src/modules/reception/components/SelfCheckinKiosk.tsx` | Khách tại sảnh | Giao diện màn hình lớn cảm ứng (Touch Kiosk) tại sảnh bệnh viện: Khung quét camera QR to rõ, hướng dẫn người bệnh quét vé hẹn hoặc CCCD tự phục vụ. |
| **4** | **Phiếu Khám Của Tôi** | `/my-appointments` | `src/app/my-appointments/page.tsx`<br>`src/modules/appointment/components/MyAppointmentsView.tsx` | Bệnh nhân | Danh sách lịch hẹn đã đặt, trạng thái phiếu (Chờ khám, Đang khám, Đã khám), xem chi tiết kết quả khám và đơn thuốc điện tử. |
| **5** | **Cổng Thanh Toán VNPay** | `/vnpay-mock` | `src/app/vnpay-mock/page.tsx` | Bệnh nhân | Trang mô phỏng cổng thanh toán trực tuyến: Giao diện quét mã VNPay-QR, lựa chọn ngân hàng, nút xác nhận thanh toán an toàn. |

---

### 🔐 Phân Hệ 2: Xác Thực & Quản Lý Tài Khoản (6 Giao Diện)

| STT | Tên Giao Diện | Route URL | Đường Dẫn File Mã Nguồn Chính | Phân Quyền | Nhiệm Vụ & Điểm Cần Tối Ưu UI/UX |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **6** | **Đăng Nhập** | `/login` | `src/app/login/page.tsx`<br>`src/modules/auth/components/LoginForm.tsx` | Mọi người | Form đăng nhập email/mật khẩu, ghi nhớ phiên, nút đăng nhập nhanh tài khoản Demo (Bác sĩ, Lễ tân, Admin) tiện lợi cho việc kiểm thử. |
| **7** | **Đăng Ký** | `/register` | `src/app/register/page.tsx`<br>`src/modules/auth/components/RegisterForm.tsx` | Khách vãng lai | Form tạo tài khoản bệnh nhân mới: Báo lỗi định dạng thời gian thực (real-time validation), mật khẩu bảo mật. |
| **8** | **Xác Thực OTP** | `/verify-otp` | `src/app/verify-otp/page.tsx` | Người dùng | Màn hình nhập mã OTP 4 chữ số gửi qua Zalo / Email hai bước: 4 ô nhập số tự động nhảy con trỏ, đồng hồ đếm ngược 60 giây gửi lại mã. |
| **9** | **Quên Mật Khẩu** | `/forgot-password` | `src/app/forgot-password/page.tsx` | Người dùng | Màn hình nhập địa chỉ email để nhận liên kết khôi phục tài khoản, thông báo trạng thái gửi email rõ ràng. |
| **10** | **Đặt Lại Mật Khẩu** | `/reset-password` | `src/app/reset-password/page.tsx` | Người dùng | Màn hình thiết lập mật khẩu mới từ liên kết email: Xác nhận mật khẩu khớp nhau, thước đo độ mạnh mật khẩu. |
| **11** | **Hồ Sơ Cá Nhân** | `/profile` | `src/app/profile/page.tsx`<br>`src/modules/auth/components/ProfileView.tsx` | Đã đăng nhập | Xem và cập nhật thông tin cá nhân, số điện thoại, đổi mật khẩu và xem huy hiệu vai trò người dùng. |

---

### 🩺 Phân Hệ 3: Bác Sĩ Khám Bệnh (Doctor Portal - 3 Giao Diện)

| STT | Tên Giao Diện | Route URL | Đường Dẫn File Mã Nguồn Chính | Phân Quyền | Nhiệm Vụ & Điểm Cần Tối Ưu UI/UX |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **12** | **Buồng Khám Bệnh** | `/doctor` | `src/app/doctor/page.tsx`<br>`src/modules/doctor/components/DoctorClinicView.tsx` | `ROLE_DOCTOR` | **Màn hình trọng tâm:** Banner buồng khám (hiển thị phòng & khoa), hàng đợi bệnh nhân thời gian thực, đồng hồ đếm ngược ca khám, nút khóa màn hình bảo mật, vùng nhập bệnh án và kê đơn thuốc. *(Lưu ý: Không có nút Đổi phòng)*. |
| **13** | **Quản Lý Lịch Trực** | `/doctor/schedule` | `src/app/doctor/schedule/page.tsx`<br>`src/modules/doctor/components/DoctorScheduleView.tsx` | `ROLE_DOCTOR` | Ma trận lịch trực 7 ngày trong tuần, hiển thị ca sáng/chiều, huy hiệu "Nghỉ cuối tuần" vào Thứ 7/CN, modal đăng ký ca trực và chọn buồng khám cho ngày tiếp theo. |
| **14** | **Lịch Sử Khám Bệnh** | `/doctor/history` | `src/app/doctor/history/page.tsx`<br>`src/modules/doctor/components/DoctorHistoryView.tsx` | `ROLE_DOCTOR` | Bảng tra cứu các ca khám bác sĩ đã hoàn thành: Tìm kiếm theo tên/mã bệnh nhân, lọc theo ngày, nút xem lại đơn thuốc và in phiếu. |

---

### 🛎️ Phân Hệ 4: Quầy Lễ Tân & Tiếp Đón (Reception Desk - 2 Giao Diện)

| STT | Tên Giao Diện | Route URL | Đường Dẫn File Mã Nguồn Chính | Phân Quyền | Nhiệm Vụ & Điểm Cần Tối Ưu UI/UX |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **15** | **Quầy Tiếp Đón** | `/reception` | `src/app/reception/page.tsx`<br>`src/modules/reception/components/ReceptionView.tsx` | `ROLE_STAFF` | **Màn hình trọng tâm:** Nhập mã hẹn/quét QR vé khám, tiếp nhận khách vãng lai (chỉ cần Tên + SĐT), điều phối buồng khám và cấp số thứ tự vào hàng đợi. |
| **16** | **Lịch Sử Tiếp Đón** | `/reception/history` | `src/app/reception/history/page.tsx` | `ROLE_STAFF` | Danh sách toàn bộ lượt bệnh nhân đã check-in trong ngày, trạng thái điều phối và bộ lọc tra cứu nhanh. |

---

### ⚙️ Phân Hệ 5: Quản Trị Viên (Admin Portal - 4 Giao Diện)

| STT | Tên Giao Diện | Route URL | Đường Dẫn File Mã Nguồn Chính | Phân Quyền | Nhiệm Vụ & Điểm Cần Tối Ưu UI/UX |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **17** | **Quản Trị Người Dùng** | `/admin` | `src/app/admin/page.tsx`<br>`src/modules/admin/components/UserTable.tsx` | `ROLE_ADMIN` | **Màn hình trọng tâm:** Bảng danh sách người dùng, tìm kiếm tức thời theo từng ký tự (debounce), lọc phân quyền (Bác sĩ, Lễ tân, Bệnh nhân), nút khóa/mở khóa tài khoản. |
| **18** | **Tạo Tài Khoản Mới** | `/admin/create-user` | `src/app/admin/create-user/page.tsx`<br>`src/modules/admin/components/CreateDoctorForm.tsx`<br>`src/modules/admin/components/CreateStaffForm.tsx` | `ROLE_ADMIN` | Form tạo tài khoản Bác sĩ / Lễ tân: Dropdown học hàm học vị y tế, chọn chuyên khoa, chọn phòng khám, kiểm tra ràng buộc ký tự. |
| **19** | **Quản Lý Danh Mục** | `/admin/catalog` | `src/app/admin/catalog/page.tsx`<br>`src/modules/admin/components/CatalogManager.tsx` | `ROLE_ADMIN` | Quản lý danh mục cơ sở chi nhánh phòng khám, danh mục chuyên khoa và bảng giá dịch vụ khám bệnh. |
| **20** | **Thống Kê Quản Trị** | `/admin/statistics` | `src/app/admin/statistics/page.tsx` | `ROLE_ADMIN` | Tổng quan số liệu toàn hệ thống dành cho ban giám đốc/quản trị viện. |

---

### 📊 Phân Hệ 6: Báo Cáo & Thống Kê Tổng Hợp (1 Giao Diện)

| STT | Tên Giao Diện | Route URL | Đường Dẫn File Mã Nguồn Chính | Phân Quyền | Nhiệm Vụ & Điểm Cần Tối Ưu UI/UX |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **21** | **Báo Cáo Thống Kê** | `/statistics` | `src/app/statistics/page.tsx`<br>`src/modules/statistics/components/BreakdownTable.tsx` | Admin, Bác sĩ, Lễ tân | Bảng thống kê phân bổ số ca khám theo bác sĩ & chuyên khoa, tỷ lệ hoàn thành, thời gian phục vụ trung bình và tổng doanh thu. |

---

## ⚠️ 6. NGUYÊN TẮC VÀNG KHI CHỈNH SỬA UI (BẮT BUỘC TUÂN THỦ)

> [!WARNING]
> 1. **GIỮ NGUYÊN TOÀN BỘ LOGIC NGHIỆP VỤ & GỌI API:**
>    - Tuyệt đối **không xóa** hoặc **sửa đổi** logic của các hàm `useEffect`, `useState`, các hàm gọi API (`api.getDoctorQueue()`, `api.completeConsultation()`, v.v.).
>    - Không đổi tên biến state hoặc các thuộc tính data binding quan trọng.
>
> 2. **QUY TẮC BUỒNG KHÁM BÁC SĨ (CLAB-125):**
>    - Tại giao diện buồng khám `/doctor`, **TUYỆT ĐỐI KHÔNG ĐƯỢC THÊM NÚT [Đổi phòng]**.
>    - Theo quy định bệnh viện: Bác sĩ chỉ được chọn hoặc đổi buồng khám khi đăng ký ca trực cho ngày tiếp theo (ở trang `/doctor/schedule` trước 00:00:00).
>
> 3. **DÒNG THÔNG BÁO PHIÊN BẢN TRÊN HEADER (CLAB-127):**
>    - Tại file [`HeaderNav.tsx`](../../Source_code/frontend/src/shared/components/HeaderNav/HeaderNav.tsx), dòng chữ **`Phiên bản v1.0.0`** màu ngọc dịu nhẹ nằm ngay dưới chữ trắng **`MedSched`** đã được cấu hình chuẩn. Vui lòng giữ nguyên khối định dạng này.
>
> 4. **TIỆN ÍCH NGOÀI (FloatingWidgets - Zalo, Hotline):**
>    - Đã được tự động ẩn trên các trang nghiệp vụ nội bộ (`/doctor`, `/admin`, `/reception`) để không che khuất màn hình làm việc. Giữ nguyên cấu hình này.
>
> 5. **HỆ THỐNG DESIGN SYSTEM CHUẨN CỦA MEDSCHED:**
>    - **Màu chủ đạo (Primary):** Xanh ngọc y tế Teal & Emerald (`teal-700`, `teal-800`, `emerald-600`) — tượng trưng cho sự tin cậy, y tế và sức khỏe.
>    - **Màu nền (Background):** Slate dịu mắt (`bg-slate-50`, `bg-slate-100`, card `bg-white`).
>    - **Bo góc & Bóng đổ:** Mềm mại hiện đại (`border-slate-200`, `rounded-2xl`, `rounded-3xl`, `shadow-xs`, `shadow-2xs`).
>    - **Responsive:** Đảm bảo co giãn thông minh trên cả Desktop (1920px, 1440px), Laptop (1280px) và Mobile/Tablet.

---

## 🔍 7. BƯỚC 4: KIỂM TRA BẮT BUỘC TRƯỚC KHI COMMIT (PRE-FLIGHT CHECK)

Trước khi commit mã nguồn, bạn hãy chạy 2 lệnh kiểm tra sau tại thư mục `Source_code/frontend`:

```bash
# 1. Kiểm tra lỗi kiểu dữ liệu TypeScript (BẮT BUỘC ĐẠT 0 LỖI)
pnpm exec tsc --noEmit
# (Hoặc: npx tsc --noEmit)

# 2. Thử build dự án Next.js để đảm bảo không lỗi cú pháp hoặc thẻ đóng/mở HTML
pnpm run build
```

Nếu cả 2 lệnh trên đều thành công (Exit code 0), bạn đã sẵn sàng đóng gói commit!

---

## 📦 8. BƯỚC 5: COMMIT VÀ ĐẨY CODE LÊN GITHUB

Tuân thủ chuẩn **Conventional Commits** của nhóm:

```bash
# 1. Kiểm tra danh sách file đã thay đổi (chỉ commit file bạn sửa)
git status

# 2. Thêm file vào vùng chờ commit
git add Source_code/frontend/src/...

# 3. Tạo commit với thông điệp rõ ràng
git commit -m "feat(ui): nang cap giao dien toan dien cac man hinh theo design system"

# 4. Đẩy nhánh của bạn lên GitHub
git push -u origin feature/clab-129-trang-refactor-all-ui
```

---

## 🔀 9. BƯỚC 6: MỞ PULL REQUEST (PR) VÀO NHÁNH `develop`

Sau khi `git push` thành công:
1. Mở trình duyệt truy cập kho GitHub dự án:  
   👉 **[https://github.com/kietphuchau-create/KeHoach_Js2](https://github.com/kietphuchau-create/KeHoach_Js2)**
2. Nhấn vào nút xanh **"Compare & pull request"**.
3. **CẤU HÌNH NHÁNH QUAN TRỌNG:**
   - **Base (nhánh đích):** Chọn **`develop`** *(⚠️ TUYỆT ĐỐI KHÔNG CHỌN `main`)*.
   - **Compare (nhánh nguồn):** Chọn **`feature/clab-129-trang-refactor-all-ui`**.
4. **Tiêu đề PR (Title):**  
   `feat(ui): nâng cấp giao diện toàn diện 21 màn hình hệ thống MedSched [CLAB-129]`
5. **Nội dung mô tả PR (Description):** Sao chép mẫu bên dưới và dán vào:

```markdown
## Tóm tắt
PR này cải tiến và chuẩn hóa toàn diện giao diện người dùng (UI/UX) cho toàn bộ 21 màn hình hệ thống MedSched, nâng cao tính thẩm mỹ y tế hiện đại, responsive mượt mà và tối ưu hóa trải nghiệm người dùng.

## Thay đổi chính
- Căn chỉnh typography, khoảng cách padding/margin và bảng màu chuẩn MedSched (Teal/Emerald/Slate).
- Tối ưu hiển thị responsive trên các kích thước màn hình Laptop, Tablet và Mobile.
- Giữ nguyên toàn bộ logic gọi API và ràng buộc nghiệp vụ (không đổi phòng ở /doctor, giữ nguyên phiên bản v1.0.0 trên header).

## Đã kiểm thử thế nào
- [x] Chạy TypeScript check (`pnpm exec tsc --noEmit`) đạt 0 lỗi.
- [x] Chạy `pnpm run build` thành công 100%.
- [x] Đã kiểm tra trực quan giao diện trên trình duyệt ở cả Desktop và Mobile.

## Checklist
- [x] Tách nhánh và mở PR vào nhánh `develop` (KHÔNG phải `main`)
- [x] Tên nhánh đúng chuẩn `feature/clab-129-...`
- [x] Không commit file rác, file `.env` hay mật khẩu cá nhân
```

6. Nhấn nút xanh **"Create pull request"** và thông báo lên nhóm để Trưởng nhóm vào duyệt và Merge vào `develop`.

---

## 💡 10. HỎI ĐÁP & KHẮC PHỤC LỖI THƯỜNG GẶP (FAQ)

1. **Hỏi: Khi `git pull` bị xung đột (conflict) thì làm sao?**  
   - *Trả lời:* Đảm bảo bạn đang commit mã nguồn dở dang trước (`git stash` hoặc commit nhánh riêng), sau đó chuyển về `develop` và `git pull origin develop`. Khi tạo nhánh mới từ `develop` sạch, bạn sẽ không bao giờ bị conflict.
2. **Hỏi: Bị lỗi `Port 3000 is in use`?**  
   - *Trả lời:* Tab terminal cũ đang chạy ngầm dev server. Tắt tab terminal cũ hoặc chạy `npx kill-port 3000` rồi `pnpm run dev` lại.
3. **Hỏi: Có cần sửa gì trong thư mục `Source_code/backend` không?**  
   - *Trả lời:* Bạn Trang chỉ cần tập trung làm đẹp thư mục `Source_code/frontend`. Không cần sửa đổi code Backend.
4. **Hỏi: 4 màn hình nào là trọng tâm ưu tiên làm đẹp nhất?**  
   - *Trả lời:* **Đặt lịch khám (`/booking`)**, **Buồng khám bác sĩ (`/doctor`)**, **Quầy tiếp đón (`/reception`)** và **Quản trị người dùng (`/admin`)**.

---
*Chúc bạn Trang thực hiện task thuận lợi và sáng tạo ra những giao diện thật đẹp mắt cho MedSched!*
