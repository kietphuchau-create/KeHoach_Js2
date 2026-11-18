# MEDSCHED PRO - TÀI LIỆU BÀN GIAO & TỔNG HỢP TOÀN BỘ DỰ ÁN (PROJECT HANDOVER & DEV LOG)
> **Dự án**: Hệ thống Đặt Lịch Khám Bệnh, Phân Luồng AI & Tiếp Đón Y Tế Thông Minh  
> **Đơn vị**: Khoa Công Nghệ Thông Tin — Đồ án Chuyên ngành / Tốt nghiệp  
> **Giáo viên hướng dẫn**: Thầy Trương Thanh Bình  
> **Phiên bản hiện tại**: v1.5.0-production (Đã triển khai hoàn chỉnh)  
> **Ngày cập nhật**: 18/11/2026  
> **Kho mã nguồn (GitHub)**: [https://github.com/kietphuchau-create/KeHoach_Js2](https://github.com/kietphuchau-create/KeHoach_Js2)  
> **Nhánh làm việc trung tâm**: `develop` (Tự động kích hoạt CI/CD triển khai lên Vercel Production)

---

## MỤC LỤC
1. [Tổng Quan Dự Án & Kiến Trúc Kỹ Thuật](#1-tổng-quan-dự-án--kiến-trúc-kỹ-thuật)
2. [Môi Trường Triển Khai (Live Production Links)](#2-môi-trường-triển-khai-live-production-links)
3. [Hướng Dẫn Thiết Lập & Chạy Mã Nguồn Trên Máy Khác](#3-hướng-dẫn-thiết-lập--chạy-mã-nguồn-trên-máy-khác)
4. [Quy Trình Git Flow Chuẩn (Bắt Buộc Tuân Thủ)](#4-quy-trình-git-flow-chuẩn-bắt-buộc-tuân-thủ)
5. [Tổng Hợp Toàn Bộ Các Tính Năng & Lỗi Nghiệp Vụ Đã Giải Quyết](#5-tổng-hợp-toàn-bộ-các-tính-năng--lỗi-nghiệp-vụ-đã-giải-quyết)
   - [CLAB-160: Chặn Spam Đặt Lịch & Giữ Chỗ Ảo](#clab-160-chặn-spam-đặt-lịch--giữ-chỗ-ảo-anti-spam-booking)
   - [CLAB-161: Đồng Bộ Danh Sách Voucher & Sửa Lỗi KaTeX](#clab-161-đồng-bộ-voucher-với-admin-mysql--sửa-lỗi-rò-rỉ-katex)
   - [CLAB-162: Xóa Bỏ Toàn Bộ Nút Gợi Ý Mã Ưu Đãi 1-Click](#clab-162-xóa-bỏ-nút-gợi-ý-mã-ưu-đãi-1-click--chuẩn-hóa-bảo-mật)
   - [CLAB-163: Sửa Lỗi 404 Xóa Mã Ưu Đãi Admin & Đồng Bộ MySQL 100%](#clab-163-sửa-lỗi-404-khi-admin-xóa-mã-ưu-đãi--đồng-bộ-tuyệt-đối-mysql)
   - [CLAB-164: Khóa Cứng Khung Giờ Quá Khứ Trong Ngày](#clab-164-khóa-cứng-khung-giờ-quá-khứ-trong-ngày-hôm-nay)
   - [CLAB-165: Sửa Lỗi Nút Gọi Ca Tiếp Theo Báo Hết Bệnh Nhân Khi Đang Chờ](#clab-165-sửa-lỗi-nút-gọi-bệnh-nhân-tiếp-theo-call-next-báo-hết-bệnh-nhân)
6. [Danh Sách Tài Khoản Mẫu & Mã Khuyến Mãi Kiểm Thử](#6-danh-sách-tài-khoản-mẫu--mã-khuyến-mãi-kiểm-thử)
7. [Các Nguyên Tắc Vàng Khi Tiếp Tục Phát Triển Dự Án](#7-các-nguyên-tắc-vàng-khi-tiếp-tục-phát-triển-dự-án)

---

## 1. TỔNG QUAN DỰ ÁN & KIẾN TRÚC KỸ THUẬT

MedSched Pro là nền tảng quản trị và vận hành toàn diện cho phòng khám đa khoa / bệnh viện thông minh, kết hợp giữa mô hình phân luồng khám bệnh AI (AI Triage), hệ thống quản lý ca trực bác sĩ, cổng thanh toán VietQR thật (PayOS), và bảng điều khiển tiếp đón thực tế theo thời gian thực.

### Công Nghệ Sử Dụng:
- **Frontend**:
  - Framework: `Next.js 15.5.x` (App Router, React 19).
  - Ngôn ngữ: `TypeScript 5.x`.
  - Styling: `Tailwind CSS 4.x`, Headless UI, Lucide Icons.
  - Quản lý trạng thái & real-time: `BroadcastChannel API` (đồng bộ hàng đợi xuyên suốt các tab phòng khám, quầy tiếp đón, màn hình hàng đợi).
- **Backend**:
  - Framework: `Spring Boot 3.3.x`, Java 21 LTS.
  - Kiến trúc: **Domain-Driven Design (DDD)** kết hợp **Hexagonal Architecture** (Phân tách rõ `core` usecase, `app` web controller, `persistence` JPA/MySQL).
  - Bảo mật: `Spring Security 6`, Stateless JWT Authentication, RBAC (Role-Based Access Control: `ADMIN`, `DOCTOR`, `RECEPTIONIST`, `PATIENT`).
  - Thanh toán: Tích hợp cổng PayOS VietQR tự động khớp lệnh thanh toán thật qua Webhook & Cronjob.
- **Cơ Sở Dữ Liệu**:
  - Hệ quản trị: `MySQL 8.0` trên nền tảng Render Cloud.

---

## 2. MÔI TRƯỜNG TRIỂN KHAI (LIVE PRODUCTION LINKS)

| Thành phần | Địa chỉ Production | Ghi chú vận hành |
| :--- | :--- | :--- |
| **Frontend Vercel** | [https://medsched-lyart.vercel.app](https://medsched-lyart.vercel.app) | Kết nối nhánh `develop`. Mỗi khi push vào `develop`, Vercel tự động build & deploy trong 1-2 phút. |
| **Backend API (Render)** | [https://medsched-zui5.onrender.com](https://medsched-zui5.onrender.com) | Chạy Spring Boot 3 trên Render, kết nối trực tiếp MySQL Database. |
| **Swagger / OpenAPI** | [https://medsched-zui5.onrender.com/swagger-ui.html](https://medsched-zui5.onrender.com/swagger-ui.html) | Tài liệu API endpoints chuẩn REST. |
| **Mã nguồn GitHub** | [https://github.com/kietphuchau-create/KeHoach_Js2](https://github.com/kietphuchau-create/KeHoach_Js2) | Quản lý mã nguồn theo Git Flow chuẩn của nhóm. |

---

## 3. HƯỚNG DẪN THIẾT LẬP & CHẠY MÃ NGUỒN TRÊN MÁY KHÁC

Khi bạn chuyển sang máy tính khác hoặc đồng đội muốn lấy code về tiếp tục làm việc:

### Bước 1: Clone kho mã nguồn
```bash
git clone https://github.com/kietphuchau-create/KeHoach_Js2.git
cd KeHoach_Js2/DuAnChinhThuc
git checkout develop
git pull origin develop
```

### Bước 2: Cài đặt và chạy Frontend
Di chuyển vào thư mục frontend:
```bash
cd Source_code/frontend
pnpm install
# Hoặc nếu máy chưa có pnpm: npm install
```
Kiểm tra file cấu hình môi trường `.env.local`:
```properties
NEXT_PUBLIC_API_URL=https://medsched-zui5.onrender.com/api/v1
```
*Lưu ý: Nếu chạy backend cục bộ, trỏ về `http://localhost:8080/api/v1`.*

Chạy môi trường phát triển:
```bash
pnpm run dev
# Mở trình duyệt tại http://localhost:3000
```
Kiểm tra tính toàn vẹn của build trước khi commit:
```bash
npx tsc --noEmit
pnpm run build
```

### Bước 3: Cài đặt và chạy Backend (Nếu cần chạy Backend local)
Yêu cầu máy cài **JDK 21 LTS**.
Di chuyển vào thư mục backend:
```bash
cd Source_code/backend
./gradlew compileJava
./gradlew bootRun
```
Backend sẽ khởi chạy trên cổng `8080`.

---

## 4. QUY TRÌNH GIT FLOW CHUẨN (BẮT BUỘC TUÂN THỦ)

Tuân thủ nghiêm ngặt theo hướng dẫn của **Thầy Trương Thanh Bình**:
1. **Nhánh trung tâm**: `develop` là nhánh phát triển chính. **Tuyệt đối không commit trực tiếp vào `main` hay `develop`**.
2. **Quy tắc đặt tên nhánh**:
   - Tính năng mới: `feature/clab-<ticket_number>-<mo-ta-ngan-gon>`
   - Sửa lỗi: `fix/clab-<ticket_number>-<mo-ta-ngan-gon>`
3. **Quy trình chuẩn khi làm một task mới**:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b fix/clab-xxx-ten-task develop
   
   # ... Thực hiện code, kiểm tra tsc và build ...
   
   git add .
   git commit -m "fix(scope): noi dung cong viec (CLAB-xxx)"
   git push -u origin fix/clab-xxx-ten-task
   
   # Hợp nhất vào develop để triển khai lên Vercel:
   git checkout develop
   git merge fix/clab-xxx-ten-task --no-ff -m "Merge branch 'fix/clab-xxx-ten-task' into develop (CLAB-xxx)"
   git push origin develop
   ```

---

## 5. TỔNG HỢP TOÀN BỘ CÁC TÍNH NĂNG & LỖI NGHIỆP VỤ ĐÃ GIẢI QUYẾT

Trong các phiên làm việc vừa qua, hệ thống đã được kiểm toán, tối ưu và vá toàn diện 6 vấn đề trọng yếu:

### CLAB-160: Chặn Spam Đặt Lịch & Giữ Chỗ Ảo (Anti-Spam Booking)
- **Vấn đề**: Bệnh nhân hoặc người dùng ẩn danh có thể đặt liên tiếp vô số ca khám giữ chỗ ảo với cùng 1 bác sĩ trong cùng ngày, dẫn đến nghẽn lịch khám thực tế của phòng khám.
- **Giải pháp**:
  - **Backend (`BookAppointmentService.java` & `AppointmentController.java`)**:
    - **Luật 1 (Trùng Bác Sĩ)**: Chặn đặt lịch nếu bệnh nhân đã có một ca khám trạng thái ACTIVE (`PENDING`, `CONFIRMED`) với cùng Bác sĩ này trong cùng ngày khám.
    - **Luật 2 (Giới hạn tối đa/ngày)**: Mỗi bệnh nhân chỉ được phép có tối đa 2 ca khám ACTIVE trong cùng 1 ngày trên toàn viện để đảm bảo công bằng cho người bệnh khác.
    - Đã viết unit test đầy đủ trong `BookAppointmentServiceTest.java`.
  - **Frontend (`BookingForm.tsx`)**:
    - Phát hiện sớm trùng lịch ngay trên giao diện đặt lịch: hiển thị thông báo hổ phách/đỏ nêu rõ mã phiếu khám cũ, đồng thời khóa nút `[Xác nhận đặt khám]` (`disabled=true`) để ngăn bệnh nhân submit.

### CLAB-161: Đồng Bộ Voucher Với Admin MySQL & Sửa Lỗi Rò Rỉ KaTeX
- **Vấn đề**: 
  - Trên màn hình Admin `/admin/promotions` và `/admin/schedule-config` hiển thị lỗi rò rỉ cú pháp KaTeX/LaTeX thô: `$\rightarrow$` và `$\ge$`.
  - Mã ưu đãi trong `MyAppointmentsView.tsx` bị gán cứng cố định là `'GIAOVIEN'`.
- **Giải pháp**:
  - Dùng script quét toàn bộ repository (`scan_formatting.py`), thay thế toàn bộ ký tự raw LaTeX bằng Unicode chuyên nghiệp `→` và `≥`.
  - Đưa danh sách mã khuyến mãi về đồng bộ hai chiều trực tiếp với CSDL MySQL qua API `/api/v1/admin/promotions`.

### CLAB-162: Xóa Bỏ Nút Gợi Ý Mã Ưu Đãi 1-Click & Chuẩn Hóa Bảo Mật
- **Vấn đề**: 
  - Tại Modal Voucher khi đặt lịch (`BookingForm.tsx`), có một danh sách thẻ bấm sẵn (`⚡ Chọn nhanh mã ưu đãi khả dụng: FREE, CODE2K, DEMO2K, GIAOVIEN, MEDVIP...`). Bệnh nhân bấm 1 click là được miễn cọc 0 đ ngay lập tức $\rightarrow$ vô hiệu hóa chức năng đặt cọc chống bùng lịch.
  - Tại Quầy Tiếp Đón (`ReceptionView.tsx`), phần thanh toán viện phí có hàng nút `Gợi ý nhanh: DEMO2K, GIAOVIEN, MEDVIP, CHAOBAN`. Nhân viên thu ngân bấm nhầm một nút là viện phí 500.000 đ giảm ngay xuống 2.000 đ.
- **Giải pháp**:
  - Xóa bỏ 100% các nút và thẻ chọn nhanh voucher trên toàn bộ giao diện (`BookingForm.tsx`, `ReceptionView.tsx`, `BookingMethodSelector.tsx`).
  - Đổi placeholder thành `Nhập mã ưu đãi của bạn...` (không để lộ mã nội bộ ra màn hình).
  - Bệnh nhân hoặc Thầy Cô/Tester có mã hợp lệ chỉ cần nhập tay vào ô và bấm **[Áp Dụng]**, hệ thống vẫn xác thực và giảm tiền bình thường.

### CLAB-163: Sửa Lỗi 404 Khi Admin Xóa Mã Ưu Đãi & Đồng Bộ Tuyệt Đối MySQL
- **Vấn đề**: Khi người quản trị vào `/admin/promotions` bấm icon Thùng rác để xóa mã `GIAOVIEN` hoặc `MEDFREE`, hệ thống báo lỗi đỏ: `Không tìm thấy mã ưu đãi với ID: promo-giaovien` (Lỗi HTTP 404).
- **Nguyên nhân**: CSDL MySQL thực tế trên Render chỉ có 2 mã thật là `FREE` và `CODE2K`. Code frontend cũ tự động lặp qua danh sách mock và chèn ép 5 mã ảo (`promo-giaovien`, `promo-medfree`...) vào bảng. Khi xóa, backend không tìm thấy ID này trong MySQL nên trả về 404.
- **Giải pháp**:
  - Trong `promotions.ts`: Bỏ hoàn toàn cơ chế ép mã mock trong `getPromotionsFromDb()`. Giao diện Admin giờ đây chỉ hiển thị 100% dữ liệu thật đang lưu trong MySQL.
  - Xử lý xóa an toàn (Graceful Delete): Nếu backend trả về 404 (mã mock cũ hoặc đã bị xóa trước đó), frontend tự động gỡ khỏi bộ nhớ cục bộ mà không báo lỗi làm đứng trang.
  - Bổ sung fallback trong `validatePromotion()`: Giúp Thầy Cô hoặc Tester khi gõ mã `GIAOVIEN` hay `MEDFREE` ở màn hình đặt lịch vẫn được tự động miễn 100% cọc (0 đ) mà không cần phụ thuộc vào mã ảo trong DB.

### CLAB-164: Khóa Cứng Khung Giờ Quá Khứ Trong Ngày Hôm Nay
- **Vấn đề**: Bệnh nhân đặt lịch vào lúc 19:10 tối nhưng hệ thống vẫn cho phép chọn ca 08:00 - 08:30 sáng cùng ngày. Khi bấm "Xác nhận", hệ thống mới bật popup báo lỗi: *"Không thể đặt lịch khám cho khung giờ đã qua. Vui lòng chọn khung giờ trong tương lai."*
- **Nguyên nhân**: 
  - Backend `AppointmentController.java:568` và `DoctorScheduleService.java:1377` có điều kiện `!isDev`. Khi bật chế độ DevMode 24/7, backend bỏ qua kiểm tra giờ quá khứ và trả về các ca sáng với `disabled: false`.
  - Frontend `BookingForm.tsx` thấy ca 08:00 không bị disabled nên tự động chọn làm `firstAvailable`.
  - Khi submit, tầng dịch vụ lõi `BookAppointmentService.java` chặn lại vì ca khám đã qua trong thực tế.
- **Giải pháp**:
  - **Backend**: Xóa bỏ điều kiện `!isDev`. Toàn bộ ca khám trong quá khứ của ngày hôm nay đều phải trả về `disabled = true`, `status = "expired"`, `label = "Đã qua giờ"`.
  - **Frontend (`BookingForm.tsx`)**: Tính toán thời gian thực theo giờ máy khách: nếu ngày đặt là hôm nay, mọi ca có giờ bắt đầu $\le$ giờ hiện tại đều bị khóa cứng (`disabled = true`, màu xám, không thể click).
  - Cơ chế tự chọn ca đầu tiên (`firstAvailable`) chỉ chọn ca tương lai (sau 19:10). Nếu hôm nay đã hết ca, hệ thống chuyển sang trạng thái "Hết chỗ" và hướng dẫn chọn ngày mai.
  - Bổ sung chốt chặn kiểm tra giờ quá khứ ngay tại hàm `handleBook` ở máy khách.

### CLAB-165: Sửa Lỗi Nút "GỌI BỆNH NHÂN TIẾP THEO (CALL NEXT)" Báo Hết Bệnh Nhân
- **Vấn đề**: Tại buồng khám Bác sĩ (`/doctor`), hàng đợi có bệnh nhân Nhi (`A-APP-9619`, ca 20:30 - 21:00) đang ở trạng thái `ĐANG CHỜ` (`WAITING`). Khi Bác sĩ bấm nút xanh lớn **`🔊 GỌI BỆNH NHÂN TIẾP THEO (CALL NEXT)`**, hệ thống lại hiển thị thông báo: *"THÔNG TIN: Hiện tại đã hết bệnh nhân đang xếp hàng trong ca trực!"*.
- **Nguyên nhân**: Trong `handleCallNext` của `DoctorClinicView.tsx` có đoạn code lọc:
  `filter(({ p, idx }) => idx !== activePatientIndex && (p.status === 'WAITING' || p.status === 'DEFERRED'))`.
  Đoạn code này mặc định loại trừ ca `activePatientIndex` vì cho rằng ca đó đang được khám. Nhưng thực tế bệnh nhân đang được chọn lại đang ở trạng thái `WAITING` (chưa vào phòng). Vì chỉ có 1 bệnh nhân chờ, việc loại trừ ca này làm danh sách ứng viên bị rỗng.
- **Giải pháp**:
  - Sửa `handleCallNext`: **CHỈ loại trừ ca hiện tại nếu ca đó THỰC SỰ ĐANG ĐƯỢC KHÁM (`p.status === 'IN_CONSULTATION'`)**.
  - Nếu ca hiện tại đang chọn là ca `WAITING`, hệ thống lập tức ưu tiên gọi ngay ca này, chuyển trạng thái sang `IN_CONSULTATION`, khởi động đồng hồ đếm ngược ca khám và cập nhật backend.

---

## 6. DANH SÁCH TÀI KHOẢN MẪU & MÃ KHUYẾN MÃI KIỂM THỬ

### Tài khoản đăng nhập hệ thống:
| Vai trò (Role) | Tên đăng nhập / Email | Mật khẩu | Chức năng chính |
| :--- | :--- | :--- | :--- |
| **Quản Trị Viên (Admin)** | `admin` (hoặc `admin@medsched.com`) | `123456` | Quản lý người dùng, phân quyền, cấu hình khung giờ khám viện, quản lý kho thuốc, quản lý mã voucher. |
| **Bác Sĩ (Doctor)** | `doctor_nhi` / `doctor_thanh` | `123456` | Buồng khám bệnh nhân, gọi ca, chẩn đoán triệu chứng, kê đơn thuốc, gia hạn giờ, chỉ định cận lâm sàng. |
| **Lễ Tân (Receptionist)** | `receptionist` | `123456` | Quầy tiếp đón thông minh, check-in mã hẹn, tiếp nhận bệnh nhân vãng lai, thu tiền viện phí. |
| **Bệnh Nhân (Patient)** | `patient` (hoặc đăng ký số điện thoại) | `123456` | Đặt lịch khám đa phương thức (theo ngày, theo bác sĩ, qua AI Triage), quản lý phiếu khám, quét VietQR. |

### Các mã ưu đãi / voucher kiểm thử (Testing Promo Codes):
- `FREE`: Mã đặc quyền DEV — Giảm 100% tiền đặt cọc (0 đ). Xuất phiếu khám ngay không cần chuyển khoản.
- `CODE2K`: Mã thử nghiệm VietQR thật — Đồng giá cọc đúng 2.000 đ để dùng ứng dụng ngân hàng quét VietQR PayOS thật.
- `GIAOVIEN`: Mã tri ân Giảng viên chấm thi — Miễn 100% tiền đặt cọc (0 đ).
- `DEMO2K`: Mã nghiệm thu đề tài — Giảm cọc về đúng 2.000 đ để quét VietQR trực tiếp.

---

## 7. CÁC NGUYÊN TẮC VÀNG KHI TIẾP TỤC PHÁT TRIỂN DỰ ÁN

Khi bạn mở dự án trên máy tính mới hoặc đồng đội tiếp tục code:

1. **Tuyệt đối không can thiệp CSDL Render trực tiếp**:
   - CSDL MySQL đang chạy trực tiếp trên Render Cloud phục vụ bản live. Không chạy lệnh `DROP TABLE` hay chỉnh sửa cấu trúc bảng ngoài quy trình migration JPA/Hibernate.
2. **Luôn chạy kiểm tra trước khi tạo Pull Request**:
   - Frontend: chạy `npx tsc --noEmit` và `pnpm run build` để đảm bảo 27/27 static pages không bị lỗi biên dịch.
   - Backend: chạy `./gradlew compileJava` để đảm bảo code Java không bị lỗi cú pháp.
3. **Quy tắc Vercel Deployment**:
   - Vercel Production của dự án đang được cấu hình lắng nghe nhánh **`develop`**. Mọi tính năng sau khi kiểm tra xong trên nhánh con cần merge vào `develop` và đẩy lên `origin/develop` để bản web live được cập nhật tự động.
4. **Không đưa cú pháp LaTeX thô vào giao diện JSX**:
   - Sử dụng ký tự Unicode trực tiếp (`→`, `≥`, `≤`, `•`) thay cho cú pháp KaTeX (`$\rightarrow$`) để tránh lỗi hiển thị xấu giao diện.

---
*Tài liệu này được tạo tự động và đồng bộ trực tiếp vào kho lưu trữ Git để phục vụ cho việc phát triển liên tục trên mọi thiết bị.*
