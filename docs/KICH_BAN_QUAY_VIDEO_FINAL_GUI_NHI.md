# 🎬 KỊCH BẢN CHI TIẾT QUAY VIDEO FINAL THUYẾT TRÌNH ĐỒ ÁN MEDSCHED PRO
> **Kính gửi:** Bạn Nguyễn Thị Yến Nhi (BA / Tester) & Tập thể Nhóm 02  
> **Đề tài:** MedSched Pro - Hệ thống Đặt lịch khám và Tiếp đón Y tế Thông minh  
> **Giảng viên hướng dẫn:** Thầy Trương Thanh Bình (Khoa CNTT - Điện tử, ITC)  
> **Lớp học phần:** CD25CT_CLC  
> **Thời lượng mục tiêu:** 10 – 12 phút (Tối đa 15 phút)  
> **Chất lượng:** Độ phân giải 1080p (Full HD), âm thanh rõ ràng, không rè micro.

---

## 📌 PHẦN A: DANH SÁCH CHUẨN BỊ TRƯỚC KHI BẤM NÚT QUAY (CHECKLIST)

Để video mượt mà, không bị khựng hay chờ đợi tải trang, Nhi hãy mở sẵn các tab trình duyệt và file sau đây:

### 1. Trình duyệt Web (Mở sẵn 5 Tab):
* **Tab 1 - Slide trang bìa / Trang chủ Web**: `https://medsched-lyart.vercel.app`
* **Tab 2 - GitHub Actions**: Trang repo GitHub của nhóm $\rightarrow$ Bấm tab **Actions** (chọn 1 lượt chạy có tích xanh `✓`).
* **Tab 3 - Swagger API Backend**: `https://medsched-zui5.onrender.com/swagger-ui/index.html`
* **Tab 4 - Đặt lịch khám Bệnh nhân**: `https://medsched-lyart.vercel.app/booking-method` (hoặc `/booking`).
* **Tab 5 - Quầy Lễ tân & Buồng khám**: Đăng nhập sẵn tài khoản Lễ tân (`/reception`) và Bác sĩ (`/doctor`).

### 2. VS Code (Mở sẵn 4 File Code quan trọng):
1. [`.github/workflows/ci.yml`](file:///d:/CongViec/MonHoc/JS2/KeHoach_Js2/.github/workflows/ci.yml) (Minh chứng CI/CD)
2. [`Source_code/backend/Dockerfile`](file:///d:/CongViec/MonHoc/JS2/KeHoach_Js2/Source_code/backend/Dockerfile) (Minh chứng Deploy Cloud)
3. [`GlobalExceptionHandler.java`](file:///d:/CongViec/MonHoc/JS2/KeHoach_Js2/Source_code/backend/app/src/main/java/com/medsched/common/GlobalExceptionHandler.java) (Minh chứng Unhappy Paths)
4. [`Source_code/mcp-server/server.js`](file:///d:/CongViec/MonHoc/JS2/KeHoach_Js2/Source_code/mcp-server/server.js) (Minh chứng MCP Server)

---

## 🎙️ PHẦN B: KỊCH BẢN PHÂN CẢNH & LỜI THOẠI CHI TIẾT

---

### ⏱️ PHÂN CẢNH 1: MỞ ĐẦU & GIỚI THIỆU NHÓM (Thời lượng: ~1.5 phút)

* **Màn hình quay:** Quay Slide mở đầu (hoặc Trang chủ MedSched Pro trên trình duyệt).
* **Thao tác:** Bật webcam (nếu có) hoặc rê chuột nhẹ nhàng trên màn hình.
* **🗣️ LỜI THOẠI ĐỌC:**
  > *"Em xin kính chào Thầy Trương Thanh Bình cùng toàn thể Quý Thầy Cô và các bạn.  
  > Em là **Nguyễn Thị Yến Nhi**, đại diện cho **Nhóm 02 - Lớp CD25CT_CLC**, xin phép được báo cáo và thuyết trình video nghiệm thu đồ án môn học Chuyên đề Phát triển Phần mềm với đề tài: **'MedSched Pro - Hệ thống Đặt lịch khám và Tiếp đón Y tế Thông minh'**, dưới sự hướng dẫn trực tiếp của Thầy Trương Thanh Bình.  
  > 
  > Dự án của chúng em được xây dựng với sự phối hợp chặt chẽ của tập thể 6 thành viên:
  > 1. Bạn **Châu Tuấn Kiệt** - Trưởng nhóm kiêm Kiến trúc sư hệ thống (Architect).
  > 2. Bạn **Nguyễn Văn Hiếu** - Backend Developer, phụ trách bảo mật Spring Security JWT và triển khai đám mây.
  > 3. Bạn **Lê Thành Tài** - Database Developer, thiết kế và tối ưu 23 bảng CSDL chuẩn 3NF.
  > 4. Bạn **Huỳnh Thị Kim Trang** - Frontend Developer, phụ trách giao diện Next.js 15.
  > 5. Em, **Nguyễn Thị Yến Nhi** - Business Analyst kiêm Tester, phụ trách tài liệu SRS v2.0 và kịch bản kiểm thử tự động.
  > 6. Bạn **Trần Nhật Tân** - AI & Integration Engineer, phụ trách Trợ lý AI Clinical Triage và tích hợp máy chủ MCP Server.
  > 
  > Sau đây, em xin phép đi thẳng vào phần chứng minh việc đáp ứng trọn vẹn 5 tiêu chí doanh nghiệp mà Thầy Bình đã đặt ra cho nhóm."*

---

### ⏱️ PHÂN CẢNH 2: CHỨNG MINH 5 TIÊU CHÍ DOANH NGHIỆP CỦA THẦY BÌNH (Thời lượng: ~3.5 phút)

#### 🔹 1. Tiêu chí 1: CI/CD Pipeline (GitHub Actions) (~40 giây)
* **Màn hình quay:** Chuyển sang **Tab GitHub Actions** $\rightarrow$ Sau đó lướt nhanh file [`.github/workflows/ci.yml`](file:///d:/CongViec/MonHoc/JS2/KeHoach_Js2/.github/workflows/ci.yml) trên VS Code.
* **Thao tác:** Bấm vào lần chạy workflow gần nhất có dấu tích xanh `✓`, chỉ chuột vào 3 jobs: `backend-ci`, `frontend-ci`, `ci-status`.
* **🗣️ LỜI THOẠI ĐỌC:**
  > *"Tiêu chí đầu tiên của Thầy là tự động hóa CI/CD. Nhóm đã thiết lập toàn bộ quy trình kiểm soát chất lượng mã nguồn qua GitHub Actions. Mỗi khi thành viên tạo Pull Request hoặc Push code, hệ thống tự động kích hoạt song song:  
  > - Job Backend: Chạy kiểm thử đơn vị JUnit 5 và đóng gói file JAR.  
  > - Job Frontend: Kiểm tra kiểu tĩnh TypeScript nghiêm ngặt và build tối ưu Next.js 15.  
  > Cả 2 job đều bắt buộc đạt 100% thành công thì Quality Gate mới cho phép hợp nhất code vào nhánh chính."*

#### 🔹 2. Tiêu chí 2: Triển khai Đám mây 0đ (Deploy Render & Vercel & Aiven) (~40 giây)
* **Màn hình quay:** Mở **Tab Vercel** (`medsched-lyart.vercel.app`) $\rightarrow$ Mở **Tab Swagger UI** (`medsched-zui5.onrender.com`) $\rightarrow$ Mở file [`Dockerfile`](file:///d:/CongViec/MonHoc/JS2/KeHoach_Js2/Source_code/backend/Dockerfile).
* **Thao tác:** F5 trang web thật 1 lần để thầy thấy web chạy live mượt mà. Chỉ vào thanh URL có ổ khóa HTTPS. Trong Dockerfile chỉ vào `Stage 1: builder` và `Stage 2: runtime` (cờ `-Xmx384m`).
* **🗣️ LỜI THOẠI ĐỌC:**
  > *"Tiêu chí thứ hai là Triển khai Đám mây với chi phí 0đ: Hệ thống được vận hành thực tế trên Internet theo kiến trúc 3 tầng:  
  > - Frontend Next.js 15 triển khai trên Vercel CDN với chứng chỉ bảo mật HTTPS tự động.  
  > - Backend Java 21 Spring Boot 3 đóng gói qua Dockerfile Multi-stage siêu nhẹ, giới hạn bộ nhớ dưới 384MB để vận hành ổn định trên gói Render Cloud Free.  
  > - Cơ sở dữ liệu MySQL 8.0 được lưu trữ an toàn trên Aiven Cloud với kết nối mã hóa SSL."*

#### 🔹 3. Tiêu chí 3: Xử lý các luồng không lý tưởng (Unhappy Paths) (~50 giây)
* **Màn hình quay:** Mở **Trang Đặt lịch** (`/booking`) trên Web $\rightarrow$ Mở file [`GlobalExceptionHandler.java`](file:///d:/CongViec/MonHoc/JS2/KeHoach_Js2/Source_code/backend/app/src/main/java/com/medsched/common/GlobalExceptionHandler.java).
* **Thao tác:** 
  1. Thao tác chọn lại ngày khám mà tài khoản đã có lịch $\rightarrow$ Hiện ngay **Banner cảnh báo màu vàng ấm**: *"Bạn đã có 1 ca khám của bản thân trong ngày này"*. Bấm nút `[+ Tiếp tục đặt cho Người Thân]` để thầy thấy hệ thống thông minh chuyển sang đặt hộ.
  2. Mở file `GlobalExceptionHandler.java`, chỉ vào hàm `handleSlotNotAvailable` (HTTP 409 Conflict).
* **🗣️ LỜI THOẠI ĐỌC:**
  > *"Tiêu chí thứ ba là Xử lý các luồng không lý tưởng: Nhóm không chỉ làm luồng thuận mà xây dựng cơ chế phòng thủ chặt chẽ:  
  > - Thứ nhất, cơ chế chống Spam lịch hẹn CLAB-174: Giới hạn mỗi bệnh nhân chỉ được đặt 1 ca/ngày cho mình để tránh chiếm giữ chỗ ảo, đồng thời hỗ trợ chuyển hướng linh hoạt sang đặt cho người thân.  
  > - Thứ hai, cơ chế chống Double Booking: Áp dụng khóa lạc quan Atomic CAS trên MySQL. Khi 2 người cùng bấm tranh 1 khung giờ, hệ thống lập tức bắt ngoại lệ và trả về mã HTTP 409 Conflict kèm gợi ý khung giờ thay thế."*

#### 🔹 4. Tiêu chí 4: Hệ thống API Thống kê (API Statistics) (~40 giây)
* **Màn hình quay:** Chuyển sang **Trang Dashboard Quản trị / Thống kê** (`/admin`).
* **Thao tác:** Chỉ chuột vào 4 thẻ KPI (Doanh thu, Lượt khám) $\rightarrow$ Bấm chuyển đổi bộ lọc thời gian: **Hôm nay** $\rightarrow$ **Tuần này** $\rightarrow$ **30 ngày qua** để thấy đồ thị nhảy số liệu tức thì.
* **🗣️ LỜI THOẠI ĐỌC:**
  > *"Tiêu chí thứ tư là API Statistics: Phân hệ thống kê thời gian thực được phân quyền theo mô hình RBAC. Bác sĩ chỉ xem được các ca khám của chính mình, trong khi Quản trị viên theo dõi được bức tranh tài chính toàn diện qua các cấu trúc TimeSeriesPoint dạng sóng và biểu đồ DonutSegment phân bổ chuyên khoa."*

#### 🔹 5. Tiêu chí 5: Model Context Protocol (MCP Server) (~40 giây)
* **Màn hình quay:** Mở file [`Source_code/mcp-server/server.js`](file:///d:/CongViec/MonHoc/JS2/KeHoach_Js2/Source_code/mcp-server/server.js) trên VS Code.
* **Thao tác:** Cuộn chuột chỉ vào 5 Tools: `get_doctors`, `get_appointment_by_code`, `reception_checkin`, `get_daily_statistics`, `simulate_payment_received`.
* **🗣️ LỜI THOẠI ĐỌC:**
  > *"Tiêu chí thứ năm là MCP Wrapper: Đón đầu chuẩn giao thức mở Model Context Protocol của Anthropic, nhóm đã xây dựng một MCP Server với 5 công cụ chuyên dụng. Điều này cho phép các Trợ lý AI thế hệ mới như Claude hay Antigravity có thể giao tiếp trực tiếp qua Stdio để tự động hóa các tác vụ quầy tiếp đón và thống kê phòng khám."*

---

### ⏱️ PHÂN CẢNH 3: DEMO END-TO-END CÁC LUỒNG THỰC TẾ TRÊN WEB (Thời lượng: ~5.5 phút)

#### 🔹 Luồng 1: Bệnh nhân đặt lịch & AI Clinical Triage 24/7 (~2 phút)
* **Màn hình quay:** Vào trang `/booking-method` $\rightarrow$ Chọn Trợ lý AI Triage.
* **Thao tác:** 
  1. Gõ tin nhắn triệu chứng: *"Tôi bị đau tức ngực, khó thở từ sáng"* $\rightarrow$ Nhấn gửi.
  2. AI phân tích và phản hồi: Nhận diện rủi ro, gợi ý đúng chuyên khoa **Tim mạch** và danh sách bác sĩ.
  3. Chọn Bác sĩ $\rightarrow$ Chọn ngày $\rightarrow$ Chọn khung giờ 15 phút.
  4. Màn hình thanh toán hiện ra mã **VietQR PayOS thật kèm đồng hồ đếm ngược 15 phút**.
  5. Giả lập thanh toán / Hoàn tất $\rightarrow$ Hệ thống xuất **Phiếu hẹn khám bệnh điện tử kèm mã QR Code định danh**.
* **🗣️ LỜI THOẠI ĐỌC:**
  > *"Tiếp theo là phần Demo trực tiếp hệ thống thực tế. Đầu tiên là Luồng Bệnh nhân: Người bệnh khi gặp các triệu chứng mơ hồ sẽ được Trợ lý AI Clinical Triage 24/7 phân tích bằng mô hình ngôn ngữ lớn, tích hợp bộ lọc Safety Guardrail 115 phát hiện nguy cơ cấp cứu và gợi ý chính xác chuyên khoa. Bệnh nhân chọn khung giờ và tiến hành quét mã VietQR thật chuẩn NAPAS để giữ chỗ, nhận ngay phiếu hẹn điện tử với mã QR duy nhất."*

#### 🔹 Luồng 2: Quầy Tiếp đón & Lễ tân Kanban Board (~1.5 phút)
* **Màn hình quay:** Chuyển sang giao diện Quầy Tiếp đón (`/reception`).
* **Thao tác:**
  1. Mở Bảng điều phối hàng đợi Kanban.
  2. Nhập mã hẹn hoặc giả lập quét Camera QR của phiếu hẹn vừa tạo ở Luồng 1.
  3. Bấm **Check-in 1 chạm** $\rightarrow$ Phiếu khám đổi trạng thái sang `CHECKED_IN`, nhảy sang cột Đã tiếp đón và đồng bộ số thứ tự vào buồng khám.
  4. Bấm nút **[+ Tiếp nhận vãng lai]** mở popup cấp nhanh số thứ tự cho bệnh nhân không đặt trước.
* **🗣️ LỜI THOẠI ĐỌC:**
  > *"Ở luồng thứ hai tại Quầy Lễ tân: Nhân viên y tế sử dụng Reception Board trực quan. Khi bệnh nhân đến quầy, lễ tân chỉ cần quét mã QR trên điện thoại bệnh nhân để hoàn tất thủ tục check-in trong vòng 1 giây. Ca khám lập tức chuyển trạng thái sang CHECKED_IN và tự động đẩy vào hàng đợi của Bác sĩ. Phân hệ cũng hỗ trợ tiếp nhận nhanh cho các bệnh nhân vãng lai."*

#### 🔹 Luồng 3: Buồng khám Bác sĩ & Kê đơn thuốc (~2 phút)
* **Màn hình quay:** Chuyển sang giao diện Buồng khám (`/doctor`).
* **Thao tác:**
  1. Bấm **Gọi số thứ tự** ca khám vừa check-in ở Luồng 2.
  2. Nhập thông tin chẩn đoán lâm sàng theo mã ICD-10.
  3. Kê đơn thuốc: Gõ tìm kiếm tên thuốc (ví dụ: *Paracetamol*), hệ thống tự động lọc từ kho dược và gợi ý cách dùng chuẩn y khoa.
  4. Bấm **Hoàn tất ca khám** $\rightarrow$ Hệ thống tự động chuyển trạng thái `COMPLETED` và hỗ trợ xuất file PDF toa thuốc chuẩn Bộ Y Tế.
* **🗣️ LỜI THOẠI ĐỌC:**
  > *"Cuối cùng là Buồng khám Bác sĩ: Bác sĩ theo dõi danh sách bệnh nhân chờ khám theo số thứ tự, gọi ca khám và nhập bệnh án điện tử. Khi kê đơn thuốc, ô tìm kiếm thông minh tự động gợi ý liều dùng chuẩn y khoa từ danh mục thuốc và khóa sửa đơn giá để chống sai lệch viện phí. Bác sĩ hoàn thành ca khám và xuất đơn thuốc điện tử minh bạch cho bệnh nhân."*

---

### ⏱️ PHÂN CẢNH 4: TỔNG KẾT & KẾT THÚC (Thời lượng: ~1 phút)

* **Màn hình quay:** Mở lại Slide tổng kết (hoặc hiển thị Bảng phân công 6 thành viên trong file Word).
* **🗣️ LỜI THOẠI ĐỌC:**
  > *"Kính thưa Thầy Trương Thanh Bình,  
  > Thông qua video báo cáo vừa rồi, nhóm 02 chúng em đã chứng minh việc hoàn thiện 100% các phân hệ nghiệp vụ, đáp ứng xuất sắc toàn diện cả 5/5 tiêu chí trọng tâm mà Thầy đã giao và vận hành mượt mà trên môi trường Internet thực tế.  
  > 
  > Toàn bộ 6 thành viên trong nhóm chúng em xin gửi lời tri ân sâu sắc nhất đến Thầy vì đã luôn tận tình hướng dẫn, đưa ra những nhận xét chuyên môn khắt khe và thực tế giúp chúng em trưởng thành rất nhiều sau đồ án này.  
  > Chúng em xin chân thành cảm ơn Thầy và kính chúc Thầy luôn dồi dào sức khỏe!"*

---

## 💾 PHẦN C: HƯỚNG DẪN XUẤT VÀ NỘP VIDEO

1. **Sau khi quay xong:**
   - Dùng phần mềm quay màn hình (như **OBS Studio**, **Camtasia** hoặc công cụ quay sẵn có trên Windows `Win + Alt + R`).
   - Xuất video chuẩn định dạng: **`.mp4`** (1080p).
2. **Cách đặt tên file:**
   ```text
   Video_Final_ThuyetTrinh_MedSched_Nhom02.mp4
   ```
3. **Cách nộp:**
   - **Cách 1 (Nếu video < 100MB):** Copy thẳng file vào thư mục `03_Video_Thuyet_Trinh` của gói nộp bài.
   - **Cách 2 (Nếu video nặng > 100MB - Khuyên dùng):** Upload lên Google Drive của bạn (chọn quyền *"Bất kỳ ai có đường liên kết đều có thể xem"*) $\rightarrow$ Dán đường link vào file [Link_Google_Drive_Video.txt](file:///d:/CongViec/MonHoc/JS2/CD25CT_CLC_Nhom02_MedSched_Final/03_Video_Thuyet_Trinh/Link_Google_Drive_Video.txt).
   - Sau đó chỉ cần click chạy script `Tao_File_Zip_Nop_Thay_Binh.ps1` là hoàn tất!
