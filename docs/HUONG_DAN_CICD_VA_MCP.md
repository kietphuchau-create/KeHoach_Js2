# 📘 HƯỚNG DẪN CHI TIẾT: CI/CD PIPELINE & MCP WRAPPER (MEDSCHED)

Tài liệu này phục vụ giải trình, báo cáo tiến độ và demo cho Giảng viên về **Yêu cầu 1 (CI/CD)** và **Yêu cầu 5 (MCP Wrapper)** của dự án **MedSched**.

---

## 🚀 PHẦN 1: CI/CD PIPELINE (CONTINUOUS INTEGRATION / CONTINUOUS DEPLOYMENT)

### 1. File cấu hình
* **Đường dẫn:** [`.github/workflows/ci.yml`](file:///d:/HOCTAP/jspring/KeHoach_Js2/.github/workflows/ci.yml)
* **Kích hoạt tự động khi:** Có thao tác `git push` hoặc tạo `pull_request` vào các nhánh `main`, `develop` và các nhánh tính năng `feature/**`.

### 2. Các giai đoạn trong Pipeline (Jobs)
1. **`backend-ci` (Spring Boot & Gradle):**
   * Môi trường: Ubuntu, JDK 21 (Eclipse Temurin).
   * Chạy toàn bộ các bài kiểm thử tự động JUnit 5 (`./gradlew test`).
   * Biên dịch và đóng gói file thực thi production (`./gradlew :app:bootJar`).
   * Lưu trữ artifact `backend-bootjar` lên GitHub Artifacts trong 7 ngày để phục vụ deploy.
2. **`frontend-ci` (Next.js 15 & React 19):**
   * Môi trường: Ubuntu, Node.js 20, pnpm 9.
   * Caching kho thư viện pnpm store giúp tăng tốc độ build.
   * Chạy kiểm tra kiểu dữ liệu TypeScript nghiêm ngặt (`tsc --noEmit`).
   * Biên dịch và tối ưu hóa gói ứng dụng Next.js (`pnpm build`).
3. **`ci-status` (Đánh giá chất lượng):**
   * Chỉ cho phép thông qua (dấu tích xanh ✅) khi cả Backend và Frontend đều đạt 100% chuẩn kiểm thử. Ngăn chặn triệt để tình trạng code lỗi bị đẩy lên production.

---

## 🤖 PHẦN 2: MCP WRAPPER (MODEL CONTEXT PROTOCOL WRAPPER)

### 1. MCP Wrapper là gì?
* **Model Context Protocol (MCP)** là chuẩn mở do Anthropic và cộng đồng AI khởi xướng, cho phép các mô hình ngôn ngữ lớn (LLM như Claude, Gemini, Antigravity, ChatGPT) **kết nối an toàn và trực tiếp** với các dịch vụ nội bộ (APIs, CSDL).
* **MedSched MCP Wrapper** đóng vai trò là một Agent Gateway biến hệ thống MedSched thành một bộ công cụ y tế thông minh mà AI có thể gọi trực tiếp thông qua ngôn ngữ tự nhiên.

### 2. Cấu trúc thư mục mã nguồn
* Thư viện chính thức: `@modelcontextprotocol/sdk` (Node.js ESM).
* Thư mục mã nguồn: [`Source_code/mcp-server/`](file:///d:/HOCTAP/jspring/KeHoach_Js2/Source_code/mcp-server)
  * [`package.json`](file:///d:/HOCTAP/jspring/KeHoach_Js2/Source_code/mcp-server/package.json): Khai báo module và dependencies.
  * [`server.js`](file:///d:/HOCTAP/jspring/KeHoach_Js2/Source_code/mcp-server/server.js): Mã nguồn xử lý Stdio transport và các Tool y tế.
  * [`mcp_config.example.json`](file:///d:/HOCTAP/jspring/KeHoach_Js2/Source_code/mcp-server/mcp_config.example.json): File cấu hình tích hợp vào Claude Desktop / Antigravity / Cursor.

### 3. Danh sách các Tools AI được cung cấp

| Tên Tool MCP | Chức năng đối với AI Agent | Input Tham Số |
|---|---|---|
| `get_doctors` | Tra cứu danh sách bác sĩ, học vị, phòng khám, giá khám theo chuyên khoa | `specialty` (tùy chọn) |
| `get_appointment_by_code` | Tra cứu chi tiết phiếu hẹn khám bệnh, thời gian khám, bác sĩ phụ trách | `bookingCode` (bắt buộc) |
| `reception_checkin` | Tự động làm thủ tục tiếp đón bệnh nhân tại quầy và đưa vào hàng đợi | `bookingCode` (bắt buộc) |
| `get_daily_statistics` | Lấy báo cáo thống kê nhanh tình hình khám, lượt tiếp đón, doanh thu trong ngày | `range` (`TODAY`, `THIS_MONTH`) |
| `simulate_payment_received` | Kích hoạt webhook ngân hàng mô phỏng tiền cọc đã về, phục vụ nghiệm thu tự động | `bookingCode`, `amount` |

### 4. Cách khởi chạy và Demo với Giảng viên

#### Cách 1: Chạy trực tiếp qua Terminal
```bash
cd Source_code/mcp-server
npm start
```
*Server sẽ khởi động và lắng nghe các lệnh JSON-RPC từ AI qua kênh Standard I/O.*

#### Cách 2: Tích hợp vào Claude Desktop hoặc Antigravity / Cursor
Thêm nội dung sau vào file cấu hình `claude_desktop_config.json` (nằm tại `%APPDATA%\Claude\claude_desktop_config.json` trên Windows):
```json
{
  "mcpServers": {
    "medsched": {
      "command": "node",
      "args": [
        "d:/HOCTAP/jspring/KeHoach_Js2/Source_code/mcp-server/server.js"
      ],
      "env": {
        "MEDSCHED_API_URL": "http://localhost:8080/api/v1"
      }
    }
  }
}
```

#### Kịch bản Demo thực tế:
1. Bạn hỏi AI: *"Hãy kiểm tra cho tôi danh sách bác sĩ đang trực tại MedSched?"*
   👉 AI sẽ tự kích hoạt Tool `get_doctors` và trả về danh sách bác sĩ kèm chuyên khoa và phòng khám.
2. Bạn bảo AI: *"Kiểm tra lịch hẹn MED918869 và thực hiện tiếp đón bệnh nhân vào phòng khám."*
   👉 AI sẽ tự gọi `get_appointment_by_code` sau đó gọi `reception_checkin`, thông báo số thứ tự `A-APP-1668` đã được đưa vào hàng đợi của Bác sĩ Thu Hà!
