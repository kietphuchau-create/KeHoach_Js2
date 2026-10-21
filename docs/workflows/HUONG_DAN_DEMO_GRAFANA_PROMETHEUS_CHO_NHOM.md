# 📊 CẨM NANG HƯỚNG DẪN THUYẾT TRÌNH & DEMO GRAFANA + PROMETHEUS
## THEO DÕI DỰ ÁN THẬT TRÊN MÁY CHỦ CLOUD (RENDER PRODUCTION)

> **Dự án:** Hệ thống Phòng khám Thông minh MedSched  
> **Chuyên đề:** Giám sát hiệu năng hệ thống thực tế (System Observability & Monitoring)  
> **Người soạn:** Châu Tuấn Kiệt (Trưởng nhóm)  
> **Mục tiêu:** Mọi thành viên trong nhóm đều có thể tự tin thuyết trình và demo hệ thống giám sát **máy chủ thật** trước thầy phản biện mà không gặp bất kỳ trục trặc nào.

---

## 1. TỔNG QUAN DỄ HIỂU (ĐỌC 1 PHÚT LÀ HIỂU)

### 🌟 Điểm đặc biệt: Nhóm mình theo dõi "DỰ ÁN THẬT TRÊN CLOUD", không phải đồ án đồ chơi chạy local!

Hầu hết đồ án sinh viên chỉ bật Grafana đo máy tính cá nhân (`localhost`). Nhóm MedSched đã nâng cấp lên chuẩn doanh nghiệp:
- **Máy chủ thật (Production Cloud):** Backend MedSched đang chạy 24/7 trên nền tảng đám mây Render tại địa chỉ `https://medsched-zu15.onrender.com`.
- **Cổng Metrics Thật:** `https://medsched-zu15.onrender.com/actuator/prometheus` (chuẩn OpenMetrics qua kết nối bảo mật HTTPS).
- **Cụm Giám Sát (Prometheus + Grafana):** Thu thập trực tiếp dữ liệu CPU, RAM, lưu lượng HTTP và kết nối Database của máy chủ Render từ xa theo thời gian thực (chu kỳ 5 giây/lần).

### 🛡️ Cơ chế giám sát kép (Dual-Target Monitoring):

Trong file cấu hình `Source_code/monitoring/prometheus.yml`, nhóm đã thiết lập sẵn 2 kênh:
1. **`medsched-cloud-render` (Kênh chính - DỰ ÁN THẬT):** Giám sát máy chủ Cloud `medsched-zu15.onrender.com`.
2. **`medsched-local` (Kênh dự phòng):** Giám sát `host.docker.internal:8080` khi máy tính cá nhân mất mạng Internet hoặc khi cần dev tính năng mới offline.

---

## 2. CÁCH KHỞI CHẠY ĐỂ DEMO (CỰC KỲ TIỆN LỢI CHO TẤT CẢ THÀNH VIÊN)

> [!TIP]
> **ƯU ĐIỂM VƯỢT TRỘI:** Vì hệ thống theo dõi máy chủ thật trên Render, **bạn KHÔNG CẦN phải cài đặt hay chạy Spring Boot / MySQL trên máy tính của bạn!** Chỉ cần có mạng Internet và Docker Desktop là demo được ngay!

Các bước thực hiện chỉ tốn 30 giây:

1. **Mở ứng dụng Docker Desktop** trên máy tính của bạn (đợi góc dưới báo màu xanh _Engine running_).
2. **Chạy File Giám Sát Tự Động**:
   - Mở thư mục `Source_code/monitoring/`.
   - **Click đúp chuột** vào file: **`start-monitoring.bat`**.
   - 👉 _Hệ thống sẽ tự bật cụm Docker và tự động mở sẵn 2 tab trình duyệt trên màn hình:_
     - **Grafana Dashboard:** `http://localhost:3100` (Đã cấu hình tự động đăng nhập Admin).
     - **Prometheus Targets:** `http://localhost:9090/targets` (Xem trạng thái các máy chủ).

*(Khi thuyết trình xong, bạn chỉ cần click đúp vào file `stop-monitoring.bat` để tắt giải phóng tài nguyên).*

---

## 3. KỊCH BẢN THUYẾT TRÌNH MẪU TRƯỚC THẦY BÌNH (CHUẨN TỪNG CÂU TỪ)

### 🎙️ Lời thoại mở đầu (Tự tin & Gây ấn tượng mạnh):

> *"Dạ thưa thầy, đối với một hệ thống y tế phục vụ hàng ngàn bệnh nhân như MedSched, tính sẵn sàng và độ ổn định là yếu tố sống còn. Nhóm em không chỉ triển khai hệ thống chạy thử nghiệm trên máy cá nhân, mà **đã đưa Backend lên môi trường Production Cloud tại Render**.*
>
> *Để đảm bảo hệ thống vận hành tin cậy, nhóm em ứng dụng mô hình **Full-Stack Observability** chuẩn doanh nghiệp: **Spring Boot Actuator + Micrometer + Prometheus + Grafana**.*
>
> *Quy trình giám sát của nhóm em gồm 3 tầng:*
> 1. *Backend trên Cloud Render liên tục đo lường vi dịch vụ và xuất chỉ số chuẩn OpenMetrics qua endpoint an toàn `/actuator/prometheus`.*
> 2. *Prometheus Server cào số liệu định kỳ mỗi 5 giây qua giao thức HTTPS.*
> 3. *Grafana trực quan hóa toàn bộ sức khỏe hệ thống: từ CPU, RAM JVM, độ trễ API tới kết nối CSDL theo thời gian thực."*

---

### 🖱️ Các bước thao tác trên màn hình (Thao tác đến đâu, giải thích đến đó):

#### Bước 1: Cho thầy xem mục tiêu giám sát (Prometheus UI)
- Mở tab **Prometheus (`http://localhost:9090/targets`)**:
- Chỉ chuột vào mục **`medsched-cloud-render`** có trạng thái **UP (màu xanh lá)**:
  > *"Dạ thưa thầy, đây là minh chứng Prometheus đang kết nối trực tiếp đến máy chủ thật `medsched-zu15.onrender.com:443`. Trạng thái UP xanh lá thể hiện đường truyền thông suốt và số liệu đang được cào về đều đặn mỗi 5 giây."*

#### Bước 2: Trình diễn trung tâm điều hành (Grafana Dashboard)
- Mở tab **Grafana (`http://localhost:3100`)**:
- Giới thiệu 4 cụm chỉ số vàng (Golden Signals) của Cloud Backend:
  1. **JVM Heap Memory Used**: Lượng RAM mà ứng dụng đang chiếm dụng trên Cloud container (đảm bảo không bị lỗi tràn bộ nhớ `OutOfMemoryError`).
  2. **Process CPU Usage**: Phần trăm CPU máy chủ đang chịu tải.
  3. **HTTP Server Requests (RPS & Latency)**: Tần suất gọi API và thời gian phản hồi (giúp phát hiện endpoint nào bị chậm).
  4. **HikariCP Active/Idle Connections**: Số lượng kết nối đang mở tới CSDL MySQL trên đám mây.

#### Bước 3: Màn biểu diễn "NHẢY SỐ THỜI GIAN THỰC" (Bí quyết lấy trọn điểm 10):
- **Cách làm:**
  1. Mở chia đôi màn hình: Một bên là **Grafana**, một bên là **Giao diện đặt khám MedSched** (hoặc mở trang web trên điện thoại).
  2. Thực hiện thao tác: Bấm nút **Đặt lịch hẹn**, hoặc nhập triệu chứng bệnh vào ô **AI Triage** rồi bấm Phân tích 2 - 3 lần.
  3. Ngay lập tức quay sang màn hình Grafana: Chỉ vào biểu đồ `HTTP Server Requests`:
     > *"Dạ thầy nhìn biểu đồ HTTP Requests: khi người dùng vừa thao tác trên giao diện, máy chủ Render Cloud ngay lập tức xử lý và đồ thị trên Grafana nhích lên theo đúng thời gian thực. Điều này chứng minh hệ thống đang giám sát dữ liệu thực tế 100%!"*

---

## 4. BỘ CÂU HỎI PHẢN BIỆN CỦA THẦY BÌNH & CÂU TRẢ LỜI MẪU (FAQ)

### ❓ Câu 1: "Làm sao thầy biết số liệu trên Grafana là của server Render thật chứ không phải dữ liệu giả lập từ máy tính cá nhân?"
- **Trả lời chuẩn:**
  > *"Dạ thưa thầy, có 3 minh chứng rõ ràng ạ:*
  > 1. *Trong Prometheus Targets (`/targets`), target đang scrape là domain `medsched-zu15.onrender.com:443` với nhãn `job="medsched-cloud-render"`.*
  > 2. *Thầy có thể truy cập trực tiếp bằng điện thoại vào `https://medsched-zu15.onrender.com/actuator/prometheus` sẽ thấy toàn bộ raw metrics trùng khớp 100% với số liệu Prometheus vừa cào về.*
  > 3. *Ngay cả khi nhóm em tắt toàn bộ IDE và không chạy Backend trên máy cá nhân, Grafana vẫn vẽ biểu đồ sống từ Render Cloud bình thường ạ."*

### ❓ Câu 2: "Prometheus lấy dữ liệu từ Spring Boot bằng cơ chế Push hay Pull? Tại sao chọn cơ chế đó?"
- **Trả lời chuẩn:**
  > *"Dạ thưa thầy, Prometheus sử dụng cơ chế **PULL** (kéo dữ liệu). Cứ mỗi 5 giây, Prometheus Server chủ động gửi một HTTP GET request đến endpoint `/actuator/prometheus`.*
  > *Ưu điểm của cơ chế PULL là:*
  > - *Backend không cần biết ai đang giám sát mình, giảm tải tối đa cho ứng dụng chính.*
  > - *Nếu máy chủ giám sát bị nghẽn mạng, Backend vẫn chạy bình thường mà không sợ bị dồn ứ bộ nhớ gửi đi như cơ chế PUSH.*
  > - *Dễ dàng quản lý và xác thực tập trung các máy chủ mục tiêu ngay trên Prometheus Server."*

### ❓ Câu 3: "Việc cào metrics qua Internet về máy tính cá nhân có làm chậm server Cloud Render không?"
- **Trả lời chuẩn:**
  > *"Dạ thưa thầy, hoàn toàn không đáng kể vì 2 lý do:*
  > 1. *Thư viện Micrometer bên trong Spring Boot sử dụng các bộ đếm nguyên tử không khóa (lock-free atomic counters), chỉ cập nhật trên bộ nhớ RAM nên tải CPU < 0.5%.*
  > 2. *Dữ liệu xuất ra dưới dạng text nén OpenMetrics dung lượng rất nhỏ (~ vài chục KB mỗi lần scrape) nên băng thông mạng hầu như không bị ảnh hưởng."*

### ❓ Câu 4: "Tại sao nhóm cấu hình Grafana chạy cổng 3100 thay vì cổng mặc định 3000?"
- **Trả lời chuẩn:**
  > *"Dạ thưa thầy, cổng 3000 là cổng tiêu chuẩn của dự án Frontend (Next.js). Nhóm em chủ động map port sang **3100:3000** trong Docker Compose để tránh tuyệt đối xung đột cổng khi một thành viên muốn chạy đồng thời cả Frontend và hệ thống giám sát trên cùng một máy tính ạ."*

### ❓ Câu 5: "Nếu trường bị mất mạng Internet trong lúc thuyết trình thì nhóm xử lý thế nào?"
- **Trả lời chuẩn:**
  > *"Dạ thưa thầy, nhóm em đã tính toán trước phương án dự phòng (High Availability). Trong cấu hình `prometheus.yml`, nhóm em có sẵn target thứ 2 là `medsched-local` trỏ về `host.docker.internal:8080`. Nếu mất Internet, nhóm chỉ cần bật backend local lên là hệ thống giám sát tự động chuyển sang đo lường máy local ngay lập tức mà không cần sửa cấu hình."*

---

## 5. BẢNG TỔNG HỢP CÁC ĐƯỜNG LINK QUAN TRỌNG

| Thành phần | Đường dẫn (URL) | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Grafana Dashboard** | `http://localhost:3100` | Màn hình biểu đồ chính để thuyết trình cho thầy xem |
| **Prometheus Targets** | `http://localhost:9090/targets` | Chứng minh trạng thái kết nối Cloud Render đang **UP** |
| **Cloud Backend (Thật)** | `https://medsched-zu15.onrender.com` | Máy chủ thật chạy 24/7 trên Render Cloud |
| **Cloud Prometheus Metrics** | `https://medsched-zu15.onrender.com/actuator/prometheus` | Raw data chuẩn OpenMetrics để kiểm chứng tính xác thực |
| **Slide Thuyết Trình Web** | `docs/monitoring-presentation.html` | Slide bài thuyết trình công nghệ 3D trực quan |

---

## 6. TIN NHẮN MẪU GỬI NHÓM ZALO

*(Các bạn có thể copy nội dung này gửi vào nhóm Zalo để phổ biến cho cả nhóm):*

```text
📢 THÔNG BÁO CHO CẢ NHÓM VỀ DEMO GRAFANA + PROMETHEUS THEO DÕI DỰ ÁN THẬT:
Hệ thống giám sát của nhóm mình đã được nâng cấp lên chuẩn doanh nghiệp: GIÁM SÁT TRỰC TIẾP MÁY CHỦ THẬT TRÊN RENDER CLOUD (https://medsched-zu15.onrender.com)!

Ưu điểm cực lớn cho tất cả thành viên:
1. Bạn KHÔNG CẦN phải chạy Spring Boot hay MySQL trên máy cá nhân nữa. Server Render đã chạy sẵn 24/7.
2. Để demo cho thầy xem: Chỉ cần mở Docker Desktop, click đúp file `Source_code/monitoring/start-monitoring.bat` là xong! Hệ thống tự bật và mở sẵn Grafana + Prometheus đo số liệu máy chủ thật.
3. Kịch bản nói mẫu và bộ câu hỏi phản biện của thầy Bình (kèm câu trả lời chuẩn 10/10) đã có tại:
👉 `docs/workflows/HUONG_DAN_DEMO_GRAFANA_PROMETHEUS_CHO_NHOM.md`

Mọi người kéo nhánh develop về chạy thử nhé, cực kỳ tiện và chắc chắn lấy điểm cao!
```

