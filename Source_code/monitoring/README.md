# HƯỚNG DẪN GIÁM SÁT HỆ THỐNG MEDSCHED VỚI PROMETHEUS & GRAFANA

Hệ thống MedSched đã được tích hợp bộ đôi chuẩn công nghiệp: **Spring Boot Actuator + Micrometer + Prometheus + Grafana** để giám sát toàn diện hiệu năng và sức khỏe hệ thống theo thời gian thực (Infrastructure & Application Observability).

---

## 1. KIẾN TRÚC HOẠT ĐỘNG

```
[ MedSched Backend (Port 8080) ]
        │
        │ (Xuất metrics thời gian thực tại /actuator/prometheus)
        ▼
[ Prometheus Server (Port 9090) ]
        │ (Cào dữ liệu tự động mỗi 5 giây)
        ▼
[ Grafana Dashboard (Port 3100) ]
   (Vẽ biểu đồ RPS, HTTP 200 vs 429/500, Database Pool, CPU/RAM)
```

---

## 2. KIỂM TRA METRICS TRỰC TIẾP TỪ BACKEND

Khi Backend MedSched đang chạy trên cổng `8080`:
- **Xem Health Check:** Truy cập `http://localhost:8080/actuator/health`
- **Xem Prometheus Metrics:** Truy cập `http://localhost:8080/actuator/prometheus`

---

## 3. KHỞI CHẠY PROMETHEUS VÀ GRAFANA BẰNG DOCKER

Tại thư mục `Source_code/monitoring`, mở Terminal và chạy:

```bash
docker compose -f docker-compose-monitoring.yml up -d
```

### 3.1. Truy cập Prometheus
- URL: **http://localhost:9090**
- Vào mục **Status** -> **Targets**: Bạn sẽ thấy `medsched-backend` trạng thái **UP** (màu xanh lá).
- Thử nghiệm gõ truy vấn:
  - `http_server_requests_seconds_count`: Đếm tổng số lượng request theo endpoint và HTTP status.
  - `jvm_memory_used_bytes`: Bộ nhớ RAM ứng dụng đang tiêu thụ.
  - `process_cpu_usage`: Tỷ lệ phần trăm CPU sử dụng.

### 3.2. Truy cập Grafana
- URL: **http://localhost:3100** (Đã chuyển sang cổng 3100 để không trùng với Frontend Next.js cổng 3000)
- Tài khoản đăng nhập mặc định:
  - **Username:** `admin`
  - **Password:** `admin`
- **Kết nối Data Source:**
  1. Vào menu **Connections** -> **Data Sources** -> Chọn **Prometheus**.
  2. Tại ô URL: Nhập `http://prometheus:9090`.
  3. Bấm **Save & Test** (Hiển thị thông báo xanh: *Successfully queried the Prometheus API*).
- **Import Dashboard mẫu:**
  - Nhập ID Dashboard mẫu của Spring Boot: **`11378`** (JVM Micrometer Dashboard) -> Bấm **Load**.
  - Toàn bộ đồ thị CPU, RAM, Thread, Garbage Collection và HTTP requests sẽ hiện lên chuyên nghiệp!
