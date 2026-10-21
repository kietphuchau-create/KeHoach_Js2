# 📚 HỒ SƠ TÀI LIỆU DỰ ÁN MEDSCHED (DOCUMENTATION INDEX)

> Toàn bộ tài liệu kỹ thuật, quy trình làm việc, kiến trúc hệ thống và báo cáo kiểm thử của dự án MedSched được phân loại khoa học theo 4 nhóm chuyên đề dưới đây:

---

## 🗂️ 1. Quy Trình Làm Việc & Hướng Dẫn Nhóm (`docs/workflows/`)

| Tên tài liệu | Mô tả nội dung | Đối tượng áp dụng |
| :--- | :--- | :--- |
| 📄 [`GIT_WORKFLOW.md`](./workflows/GIT_WORKFLOW.md) | **Quy trình Git Flow chuẩn** theo chỉ đạo thầy Bình: Quy ước đặt tên nhánh `feature/clab-...`, commit chuẩn và mở PR vào `develop`. | Toàn bộ thành viên |
| 🎨 [`HUONG_DAN_NHAN_TASK_UI_TRANG.md`](./workflows/HUONG_DAN_NHAN_TASK_UI_TRANG.md) | **Hướng dẫn nhận task UI** dành cho bạn Trang: Kéo code từ `develop`, chạy frontend Next.js, nguyên tắc giữ logic và nộp PR. | Trang (Frontend/UI) |
| ⚙️ [`HUONG_DAN_CICD_VA_MCP.md`](./workflows/HUONG_DAN_CICD_VA_MCP.md) | Thiết lập kiểm tra tự động GitHub Actions CI/CD và cấu hình Model Context Protocol. | DevOps / Team |
| 🤝 [`GOP_Y_VA_DONG_BO_NHANH_CLAB_103_HIEU.md`](./workflows/GOP_Y_VA_DONG_BO_NHANH_CLAB_103_HIEU.md) | Hướng dẫn đồng bộ nhánh backend Use Cases và giải quyết conflict logic. | Backend Dev |

---

## 🏛️ 2. Kiến Trúc Hệ Thống & Đặc Tả Nghiệp Vụ (`docs/architecture/`)

| Tên tài liệu | Mô tả nội dung |
| :--- | :--- |
| 🔑 [`API_VA_TAI_KHOAN.md`](./architecture/API_VA_TAI_KHOAN.md) | **Đặc tả danh mục API RESTful**, cấu trúc token JWT và bảng tài khoản mẫu đầy đủ 4 vai trò (Admin, Bác sĩ, Lễ tân, Bệnh nhân). |
| 💻 [`FRONTEND_ARCHITECTURE.md`](./architecture/FRONTEND_ARCHITECTURE.md) | Cấu trúc phân tầng module Frontend Next.js 15, State Management và Design System. |
| 📋 [`TongHopQuyTacFN.md`](./architecture/TongHopQuyTacFN.md) | Bộ quy tắc chuẩn hóa giao diện, form validation thời gian thực và xử lý luồng người dùng. |
| 📑 [`Danh_sach_CAB_dich_v2.md`](./architecture/Danh_sach_CAB_dich_v2.md) | Bảng phân rã tính năng (Features F01–F26) và tiến độ các ticket CAB. |
| 🚪 [`QuyDinh_KhoaBuongKham_KhiBatDauNgayMoi.md`](./architecture/QuyDinh_KhoaBuongKham_KhiBatDauNgayMoi.md) | Quy định an toàn: Khóa tính năng đổi phòng trong ngày, chỉ cho phép chọn buồng khám khi đăng ký ca trực ngày tiếp theo. |
| 🛡️ [`HuongDan_GioiHan_1_Phien_Dang_Nhap.md`](./architecture/HuongDan_GioiHan_1_Phien_Dang_Nhap.md) | Kiểm soát đơn phiên (Single Session Enforcement) và khóa màn hình bảo mật buồng khám. |
| 🩺 [`KhuyetDiem_XungDot_BuongKham_CaTruc.md`](./architecture/KhuyetDiem_XungDot_BuongKham_CaTruc.md) | Cơ chế chống trùng buồng khám giữa các bác sĩ trong cùng khung giờ. |
| ⚡ [`KhuyetDiem_CacDiemNghenHeThong_Va_GiaiPhap.md`](./architecture/KhuyetDiem_CacDiemNghenHeThong_Va_GiaiPhap.md) | Phân tích các điểm nghẽn hiệu năng (bottlenecks) và phương án xử lý concurrency. |
| 🏥 [`KE_HOACH_CHUYEN_DOI_PHONG_KHAM_TU.md`](./architecture/KE_HOACH_CHUYEN_DOI_PHONG_KHAM_TU.md) | Đề án chuyển đổi số vận hành từ phòng khám truyền thống sang MedSched Smart Healthcare. |

---

## 🚀 3. Triển Khai & Vận Hành Hạ Tầng (`docs/deployment/`)

| Tên tài liệu | Mô tả nội dung |
| :--- | :--- |
| 🌐 [`HUONG_DAN_DEPLOY_MEDSCHED.md`](./deployment/HUONG_DAN_DEPLOY_MEDSCHED.md) | **Hướng dẫn triển khai trọn gói** MedSched lên Cloud (Render Backend + Vercel Frontend + Aiven MySQL). |
| 📋 [`KeHoach_Deploy_MedSched.md`](./deployment/KeHoach_Deploy_MedSched.md) | Kế hoạch phân bổ tài nguyên, cấu hình biến môi trường và tên miền phòng khám. |
| 🛠️ [`NHIEM_VU_DEPLOY_RENDER_HIEU.md`](./deployment/NHIEM_VU_DEPLOY_RENDER_HIEU.md) | Checklist chi tiết cấu hình Dockerfile và dịch vụ Web Service trên Render. |

---

## 📊 4. Báo Cáo Tiến Độ & Hồ Sơ Kiểm Thử (`docs/reports/`)

| Tên tài liệu / Thư mục | Mô tả nội dung |
| :--- | :--- |
| 📈 [`BAO_CAO_TIEN_DO_CONG_VIEC.md`](./reports/BAO_CAO_TIEN_DO_CONG_VIEC.md) | **Báo cáo tiến độ** dành cho PM & Giáo viên hướng dẫn tổng hợp các mốc công việc hoàn thành. |
| 🧪 [`test/`](./reports/test/) | Thư mục hồ sơ QA/QC gồm: <br>- `Test_Cases_MedSched_function.xlsx` (Bảng kịch bản test chi tiết)<br>- `Test_Plan_MedSched_function.docx` (Kế hoạch kiểm thử tính năng)<br>- `bugs_report.docx` (Báo cáo tổng hợp lỗi và phương án khắc phục) |
