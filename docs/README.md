# 📚 TỔNG HỢP TÀI LIỆU KỸ THUẬT & QUẢN TRỊ DỰ ÁN MEDSCHED PRO
> **Hệ Thống Đặt Lịch Khám Bệnh Trực Tuyến & Quản Trị Y Tế Thông Minh**  
> **Trường Cao Đẳng Công Nghệ Thông Tin TP.HCM (ITC)** · **Khoa CNTT**  
> **GVHD:** Thầy Trương Thanh Bình · **Nhóm 02** (Lớp CD25CT_CLC)

---

## 📌 BẢN ĐỒ PHÂN MỤC TÀI LIỆU (DOCUMENTATION INDEX)

Toàn bộ tài liệu được quy hoạch ngăn nắp thành **5 phân mục lớn** theo chuẩn công nghiệp:

```
DuAnChinhThuc/docs/
│
├── 📁 01_KienTruc_Va_ThietKe/       ➔ Thiết kế kiến trúc phần mềm, sơ đồ tương tác & quy tắc nghiệp vụ
├── 📁 02_TrienKhai_Cloud_CICD/      ➔ Kế hoạch triển khai Render Cloud, CI/CD Pipeline & MCP Server
├── 📁 03_QuyTrinh_Va_PhanCong/      ➔ Quy trình Git Flow chuẩn nhóm, hướng dẫn phân công nhiệm vụ
├── 📁 04_KiemThu_Va_BaoCao/         ➔ Kế hoạch kiểm thử, bộ Test Cases, báo cáo lỗi & tiến độ
├── 📁 05_ThuyetTrinh_Va_TinhNang/   ➔ Kịch bản thuyết trình, tóm tắt 90 tính năng & Slide liên kết
└── 📁 assets/                       ➔ Logo ITC, MedSched và tài nguyên đồ họa dùng trong tài liệu
```

---

### 🏛️ 1. Kiến Trúc & Thiết Kế Kỹ Thuật (`01_KienTruc_Va_ThietKe`)
Tập trung toàn bộ hồ sơ thiết kế kỹ thuật, sơ đồ hệ thống và quy tắc nghiệp vụ cốt lõi:

| Tên Tài Liệu | Định Dạng | Mô Tả Trọng Tâm |
|---|:---:|---|
| **`FRONTEND_ARCHITECTURE.md`** | Markdown | Kiến trúc Frontend Next.js 15, Tailwind v4, PWA Kiosk & Cổng bệnh nhân |
| **`API_VA_DANH_SACH_TAI_KHOAN.md`** | Markdown | Danh sách toàn bộ Endpoint RESTful API & 4 tài khoản mẫu nghiệm thu |
| **`DANH_SACH_CAB_DICH_VU_V2.md`** | Markdown | Danh mục cấu hình dịch vụ y tế CAB phiên bản chuẩn hóa v2 |
| **`QUY_TAC_1_PHIEN_DANG_NHAP_JWT.md`** | Markdown | Cơ chế Single Session, Blacklist `revoked_tokens` triệt tiêu chiếm phiên |
| **`QUY_DINH_KHOA_BUONG_KHAM.md`** | Markdown | Quy định khóa buồng khám và cấp phát số thứ tự khi bắt đầu ngày mới |
| **`DIEM_NGHEN_HE_THONG_VA_GIAI_PHAP.md`** | Markdown | Phân tích các điểm nghẽn tương tranh (Concurrency) & giải pháp tối ưu |
| **`XUNG_DOT_BUONG_KHAM_VA_CA_TRUC.md`** | Markdown | Cơ chế phát hiện và giải quyết xung đột lịch trực Bác sĩ & buồng khám |
| **`KE_HOACH_CHUYEN_DOI_PHONG_KHAM_TU.md`**| Markdown | Phương án chuyển đổi số từ mô hình phòng khám thủ công sang MedSched |
| **`TONG_HOP_QUY_TAC_FRONTEND.md`** | Markdown | Bộ quy chuẩn UI/UX, responsive, typography và xử lý trạng thái phía Client |
| **`SoDo_UseCase_MedSched.drawio`** | Draw.io | Sơ đồ Use Case tổng thể toàn hệ thống chuẩn UML |
| **`medsched_archify_architecture.html`**| HTML SVG | **Sơ đồ kiến trúc tương tác Archify** (High-Level Architecture có Live Flow) |
| **`medsched_patient_workflow.html`** | HTML SVG | **Sơ đồ quy trình 1 ca khám hoàn chỉnh** (5 Bước tương tác thời gian thực) |

---

### ☁️ 2. Triển Khai Cloud & CI/CD (`02_TrienKhai_Cloud_CICD`)
Hướng dẫn vận hành, tự động hóa và triển khai môi trường Production:

| Tên Tài Liệu | Định Dạng | Mô Tả Trọng Tâm |
|---|:---:|---|
| **`HUONG_DAN_DEPLOY_RENDER.md`** | Markdown | Hướng dẫn triển khai Backend Spring Boot & MySQL trên Render Cloud |
| **`KE_HOACH_DEPLOY_MEDSCHED.md`** | Markdown | Kế hoạch tổng thể và lộ trình phát hành các phiên bản lên Production |
| **`NHIEM_VU_DEPLOY_RENDER_HIEU.md`** | Markdown | Bảng phân công chi tiết cấu hình biến môi trường và Domain Render |
| **`HUONG_DAN_CICD_VA_MCP.md`** | Markdown | Thiết lập GitHub Actions tự động build/test & tích hợp MCP Server |

---

### 👥 3. Quy Trình Làm Việc & Phân Công (`03_QuyTrinh_Va_PhanCong`)
Quy chuẩn làm việc nhóm, hướng dẫn thành viên và quy trình Git Flow:

| Tên Tài Liệu | Định Dạng | Mô Tả Trọng Tâm |
|---|:---:|---|
| **`QUY_TRINH_GIT_FLOW.md`** | Markdown | Chuẩn Git Flow nhóm MedSched theo chỉ dẫn của Thầy Bình (nhánh `develop`) |
| **`HUONG_DAN_DEMO_GRAFANA_PROMETHEUS.md`**| Markdown | Kịch bản vận hành cụm giám sát SRE Observability trên Docker Compose |
| **`KICH_BAN_DEMO_BENH_AN_TAI.md`** | Markdown | Hướng dẫn luồng demo quản lý hồ sơ bệnh án EHR và phân quyền |
| **`HUONG_DAN_TASK_AI_CHATBOX_TAN.md`** | Markdown | Hướng dẫn nâng cấp Chatbox Spring AI Triage phân khoa thông minh |
| **`HUONG_DAN_DONG_BO_CLAB_103_HIEU.md`** | Markdown | Góp ý và chuẩn hóa đồng bộ nhánh feature theo ticket Jira CLAB-103 |
| **`HUONG_DAN_TASK_UI_TRANG.md`** | Markdown | Hướng dẫn phát triển giao diện Kiosk tiếp đón và thanh toán viện phí |

---

### 🧪 4. Kiểm Thử & Báo Cáo Nghiệm Thu (`04_KiemThu_Va_BaoCao`)
Hồ sơ kiểm thử chất lượng phần mềm, kế hoạch test và báo cáo tiến độ:

| Tên Tài Liệu | Định Dạng | Mô Tả Trọng Tâm |
|---|:---:|---|
| **`BAO_CAO_TIEN_DO_CONG_VIEC.md`** | Markdown | Báo cáo tiến độ hoàn thành các Sprint theo quy trình Scrum/Jira |
| **`BAO_CAO_AI_CHATBOX_CLAB_132.md`** | Markdown | Báo cáo kiểm nghiệm hiệu năng và độ chính xác phân luồng của Spring AI |
| **`test/Test_Plan_MedSched_function.docx`** | Word DOCX | Kế hoạch kiểm thử chức năng (Test Strategy, Test Scope, Test Environment) |
| **`test/Test_Cases_MedSched_function.xlsx`** | Excel XLSX | Bộ ma trận 100+ Test Cases chi tiết bao phủ các module nghiệp vụ |
| **`test/bugs_report.docx`** | Word DOCX | Báo cáo phân loại và khắc phục lỗi (Bug Log & Resolution Report) |

---

### 🎤 5. Thuyết Trình & Tóm Tắt Tính Năng (`05_ThuyetTrinh_Va_TinhNang`)
Hồ sơ phục vụ trực tiếp cho buổi báo cáo đồ án tốt nghiệp:

| Tên Tài Liệu | Định Dạng | Mô Tả Trọng Tâm |
|---|:---:|---|
| **`KICH_BAN_THUYET_TRINH_MEDSCHED.md`** | Markdown | Kịch bản thuyết trình chi tiết từng thành viên (Lời thoại, thao tác demo) |
| **`TOM_TAT_90_TINH_NANG_MEDSCHED.md`** | Markdown | Bảng tóm lược toàn diện 90 tính năng của hệ thống phân theo 5 phân hệ |
| **`Slide_Web_Offline_Backup/`** | Thư mục Web | Bản sao lưu slide web ngoại tuyến (Bản chính thức xem tại `08_TaiLieuTongHop`) |

---

> [!NOTE]
> Slide thuyết trình trực tuyến chính thức được xuất bản tại:  
> 🔗 **[https://kietphuchau-create.github.io/ThuyetTrinh_JS2/](https://kietphuchau-create.github.io/ThuyetTrinh_JS2/)**
