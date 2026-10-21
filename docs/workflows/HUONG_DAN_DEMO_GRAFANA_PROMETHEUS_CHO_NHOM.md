# 📊 CẨM NANG HƯỚNG DẪN THUYẾT TRÌNH & DEMO GRAFANA + PROMETHEUS (DÀNH CHO TẤT CẢ THÀNH VIÊN)

> **Dự án:** Hệ thống Phòng khám Thông minh MedSched  
> **Chuyên đề:** Giám sát hiệu năng hệ thống (System Observability & Monitoring)  
> **Người soạn:** Châu Tuấn Kiệt (Trưởng nhóm)  
> **Đối tượng:** Tất cả thành viên trong nhóm MedSched  

---

## 1. TỔNG QUAN DỄ HIỂU (ĐỌC 1 PHÚT LÀ HIỂU)

### Grafana & Prometheus là gì? Vì sao hệ thống cần có?
Trong các dự án thực tế tại doanh nghiệp, khi hệ thống chạy trên môi trường Production (như Render / Cloud), nếu web bị chậm, đơ hoặc quá tải thì kỹ sư không thể ngồi đoán mò. Họ dùng bộ đôi:
1. **Prometheus**: Là "cái đồng hồ đo điện nước tự động", cứ 5 giây nó lại vào Backend Spring Boot hỏi: *Đang dùng bao nhiêu RAM? CPU bao nhiêu %? Có bao nhiêu lượt truy cập? Có lỗi 500 nào không?* rồi ghi lại thành nhật ký.
2. **Grafana**: Là "màn hình hiển thị trung tâm điều hành", lấy dữ liệu từ Prometheus vẽ thành các biểu đồ kim quay, đồ thị đường thời gian thực cực kỳ đẹp mắt.

### Dự án nhóm mình đã làm được gì?
Nhóm mình đã tích hợp hoàn chỉnh 100% trọn bộ:
* **Backend Spring Boot**: Nhúng thư viện `micrometer-registry-prometheus` xuất metric tại `http://localhost:8080/actuator/prometheus`.
* **Cụm Docker**: Đã có sẵn Prometheus (Port 9090) và Grafana (Port 3100) được cấu hình tự động (Provisioning) kết nối sẵn với nhau.

---

## 2. CÁCH KHỞI CHẠY ĐỂ DEMO TRÊN MÁY BẤT KỲ THÀNH VIÊN NÀO (CHỈ CẦN 1 CÚ CLICK)

Mỗi bạn chỉ cần làm đúng 3 thao tác:

1. **Mở ứng dụng Docker Desktop** trên máy tính của bạn (đợi góc dưới báo màu xanh *Engine running*).
2. **Bật Backend MedSched**: Chạy Spring Boot như bình thường trên cổng `8080`.
3. **Chạy File Giám Sát**:
   * Mở thư mục `Source_code/monitoring/`.
   * **Click đúp chuột** vào file: **`start-monitoring.bat`**.
   * 👉 *Hệ thống sẽ tự khởi chạy và tự động mở sẵn 2 tab trình duyệt: Grafana và Prometheus lên màn hình của bạn!*

*(Khi thuyết trình xong, bạn chỉ cần click đúp vào file `stop-monitoring.bat` để tắt giải phóng RAM).*

---

## 3. KỊCH BẢN THUYẾT TRÌNH MẪU (BẠN NÀO ĐẠI DIỆN NÓI CŨNG ĐƯỢC)

### 🎙️ Lời thoại mở đầu (1 phút):
> *"Dạ thưa thầy, đối với một hệ thống y tế phục vụ hàng ngàn lượt đặt khám như MedSched, tính sẵn sàng và độ ổn định là yếu tố sống còn. Vì vậy nhóm em đã ứng dụng kiến trúc giám sát chuẩn doanh nghiệp: **Spring Boot Actuator + Micrometer + Prometheus + Grafana**.*
> 
> *Quy trình vận hành gồm 3 tầng:*
> 1. *Backend Spring Boot đo lường các chỉ số tài nguyên và API qua `/actuator/prometheus`.*
> 2. *Prometheus Server cào dữ liệu định kỳ mỗi 5 giây.*
> 3. *Grafana hiển thị bảng điều khiển thời gian thực để đội ngũ kỹ thuật phát hiện nghẽn mạng hoặc lỗi trước cả khi người dùng phản ánh."*

### 🖱️ Các bước thao tác trên màn hình:
1. **Chỉ tab Prometheus (`http://localhost:9090/targets`)**:
   * Cho thầy thấy dòng chữ: `medsched-backend` đang có trạng thái **UP (màu xanh lá)**.
   * Nói: *"Dạ Prometheus đang kết nối sống tới Backend và thu thập dữ liệu mỗi 5 giây."*
2. **Chỉ tab Grafana (`http://localhost:3100`)**:
   * Cho thầy xem các đồ thị:
     * **JVM Heap Memory**: Lượng RAM ứng dụng tiêu thụ.
     * **Process CPU Usage**: Tỷ lệ vi xử lý.
     * **HTTP Server Requests (RPS)**: Lưu lượng các request API gọi tới server.
     * **HikariCP Database Connections**: Số kết nối tới MySQL.
3. **Chiêu "Nhảy Số Thời Gian Thực" (Bí quyết lấy trọn điểm 10)**:
   * Mở song song 2 cửa sổ: Một bên là Grafana, một bên là web MedSched (`/booking-method`).
   * Bạn bấm Đặt lịch hoặc gõ triệu chứng cho AI phân tích 2-3 lần.
   * Chỉ tay vào màn hình Grafana: 
     > *"Dạ thầy nhìn biểu đồ HTTP Requests vừa nhích lên ngay lập tức tương ứng với các lượt click em vừa thao tác ạ!"*

---

## 4. BỘ CÂU HỎI THẦY BÌNH HAY HỎI NHẤT & CÂU TRẢ LỜI MẪU (FAQ)

### ❓ Câu 1: "Prometheus lấy dữ liệu từ Spring Boot bằng cơ chế Push hay Pull?"
* **Trả lời chuẩn**: 
  > *"Dạ thưa thầy, Prometheus hoạt động theo cơ chế **PULL** (cào dữ liệu). Cứ mỗi 5 giây, Prometheus Server sẽ chủ động gửi HTTP GET request vào endpoint `/actuator/prometheus` của Spring Boot để kéo toàn bộ metrics về lưu trữ dạng Time-series Database."*

### ❓ Câu 2: "Tại sao nhóm lại dùng Grafana cổng 3100 mà không dùng cổng mặc định 3000?"
* **Trả lời chuẩn**:
  > *"Dạ thưa thầy, cổng 3000 đã được nhóm dành riêng cho Frontend Next.js của dự án. Để tránh xung đột port khi chạy đồng thời cả Frontend và Giám sát trên cùng một máy, nhóm em đã cấu hình chuyển cổng Grafana sang **3100:3000** trong file `docker-compose-monitoring.yml`."*

### ❓ Câu 3: "Việc xuất metrics như vậy có làm lộ thông tin mật hay làm chậm hệ thống không?"
* **Trả lời chuẩn**:
  > *"Dạ thưa thầy, thư viện Micrometer thu thập dữ liệu bằng các bộ đếm không khóa (non-blocking counters) trên bộ nhớ RAM nên tải tăng thêm là không đáng kể (< 1% CPU). Ngoài ra trong file `SecurityConfig.java`, nhóm em chỉ công khai duy nhất endpoint đo lường `/actuator/prometheus`, các endpoint nhạy cảm quản trị khác đều được khóa chặt."*

---

## 5. TIN NHẮN MẪU GỬI NHÓM ZALO
*(Kiệt hoặc bất kỳ bạn nào có thể copy dán vào nhóm Zalo để thông báo cho cả nhóm):*

```text
📢 THÔNG BÁO CHO CẢ NHÓM VỀ CHUYÊN ĐỀ DEMO GRAFANA + PROMETHEUS:
Nhóm mình đã tích hợp hoàn chỉnh 100% hệ thống giám sát hạ tầng Prometheus & Grafana cho MedSched!
Để bất kỳ bạn nào trong nhóm cũng có thể tự tin demo và thuyết trình với thầy Bình:
1. Mình đã tạo sẵn file chạy tự động 1-click: Chỉ cần mở Docker Desktop rồi click đúp vào file `Source_code/monitoring/start-monitoring.bat` là hệ thống tự bật và tự mở trình duyệt lên cho bạn demo.
2. Mình đã soạn sẵn Kịch bản nói mẫu và Bộ câu hỏi phản biện của thầy kèm câu trả lời tại:
👉 `docs/workflows/HUONG_DAN_DEMO_GRAFANA_PROMETHEUS_CHO_NHOM.md`
Mọi người cùng kéo code nhánh develop về đọc qua 3 phút là nắm chắc nhé!
```
