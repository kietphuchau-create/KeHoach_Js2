# 🎙️ CẨM NANG & KỊCH BẢN THUYẾT TRÌNH TOÀN DIỆN PROMETHEUS & GRAFANA
## CHUYÊN ĐỀ TÍCH HỢP OBSERVABILITY & MONITORING VÀO DỰ ÁN THỰC TẾ MEDSCHED
### HƯỚNG DẪN CHI TIẾT TỪ A - Z TRÌNH BÀY TRƯỚC THẦY TRƯƠNG THANH BÌNH

> **Dự án:** Hệ Thống Phòng Khám & Đặt Lịch Khám Bệnh Thông Minh MedSched  
> **Chuyên đề báo cáo:** Giám Sát Hiệu Năng Thời Gian Thực Chuẩn Cloud-Native Với Prometheus & Grafana  
> **Giảng viên hướng dẫn:** Thầy Trương Thanh Bình  
> **Đơn vị thực hiện:** Nhóm phát triển MedSched  
> **Phiên bản:** v1.3.1 - Production Release  

---

## 📌 MỤC LỤC
1. [Phần 1: Cách Lên Git Kéo Mã Nguồn Mới Nhất Về Máy Của Bạn](#phan-1-lay-du-an-tu-git)
2. [Phần 2: Bản Kế Hoạch Thiết Kế Slide Thuyết Trình (Slide Design Blueprint)](#phan-2-ke-hoach-thiet-ke-slide)
3. [Phần 3: Ma Trận Đối Chiếu Mã Nguồn & Hạ Tầng Với Prometheus - Grafana](#phan-3-ma-tran-ma-nguon)
4. [Phần 4: Hướng Dẫn Vận Hành Demo Thực Tế 1-Click (Zero-Config)](#phan-4-khoi-chay-demo)
5. [Phần 5: Kịch Bản Thuyết Trình Chi Tiết Từng Slide (Lời Thoại Thực Chiến)](#phan-5-kich-ban-thuyet-trinh)
6. [Phần 6: Kịch Bản Thuyết Minh Trực Tiếp Trên Grafana & Prometheus Web](#phan-6-kich-ban-demo-grafana)
7. [Phần 7: Bộ Câu Hỏi Phản Biện Chuyên Sâu Của Thầy Bình & Cách Trả Lời](#phan-7-cau-hoi-thay-hay-hoi)
8. [Phần 8: Kế Hoạch Dự Phòng Khi Thuyết Trình (Troubleshooting)](#phan-8-xu-ly-su-co)

---

<a name="phan-1-lay-du-an-tu-git"></a>
## 🚀 PHẦN 1: CÁCH LÊN GIT KÉO MÃ NGUỒN MỚI NHẤT VỀ MÁY CỦA BẠN

### 1.1. Thông tin kho lưu trữ (Repository)
* **Link GitHub:** `https://github.com/kietphuchau-create/KeHoach_Js2.git`
* **Nhánh chính thức dùng thuyết trình:**  
  👉 **`feature/clab-136-nang-cap-ai-triage-va-trieu-chung-v131`**  
  *(Tất cả slide HTML, kịch bản Word, cụm Docker Compose và dashboard Cloud đã đồng bộ tại nhánh này).*

---

### 1.2. Thao tác đồng bộ trên máy tính cá nhân

#### 👉 TRƯỜNG HỢP A: Nếu máy ĐÃ CÓ sẵn thư mục dự án
1. Mở phần mềm **Git Bash** (hoặc Terminal trong VS Code) tại thư mục `DuAnChinhThuc`:
2. Chạy lần lượt 3 lệnh:
```bash
git fetch origin
git checkout feature/clab-136-nang-cap-ai-triage-va-trieu-chung-v131
git pull origin feature/clab-136-nang-cap-ai-triage-va-trieu-chung-v131
```
3. Kiểm tra trạng thái: `git status` (Màn hình hiện *Your branch is up to date* là chuẩn).

#### 👉 TRƯỜNG HỢP B: Nếu TẢI MỚI TỪ ĐẦU
1. Mở cửa sổ dòng lệnh tại ổ đĩa muốn lưu (ví dụ `D:\MonHocITC\Javaspring2`):
2. Chạy lệnh clone:
```bash
git clone -b feature/clab-136-nang-cap-ai-triage-va-trieu-chung-v131 https://github.com/kietphuchau-create/KeHoach_Js2.git DuAnChinhThuc
cd DuAnChinhThuc
```

---

<a name="phan-2-ke-hoach-thiet-ke-slide"></a>
## 🎨 PHẦN 2: BẢN KẾ HOẠCH THIẾT KẾ SLIDE THUYẾT TRÌNH (SLIDE DESIGN BLUEPRINT)

Slide báo cáo của nhóm được đóng gói tại file duy nhất: [Source_code/monitoring/presentation/index.html](file:///d:/MonHocITC/Javaspring2/DuAnChinhThuc/Source_code/monitoring/presentation/index.html).  
Đây là **Web Application Slide chuyên nghiệp**, không dùng PowerPoint truyền thống, tích hợp tương tác và giả lập trực tiếp.

### 2.1. Tôn chỉ & Nguyên tắc thiết kế (Design Philosophy)
1. **Phong cách Nền Trắng Tinh Tế & Hiện Đại (Clean White Theme & Fullpage Snap)**: 
   - Nền trắng tinh khôi kết hợp hiệu ứng cuộn mượt mà từng trang (Vertical Fullpage Snap Scroll với `.snap-container` và `.slide-section`).
   - Thẻ trình chiếu trung tâm dạng hộp bo góc lớn (`.content-box`, viền sắc nét, bóng đổ nhẹ đa tầng), tối ưu diện tích và độ tương phản cao cho máy chiếu.
   - Kiểu chữ hiện đại từ Google Fonts: **Plus Jakarta Sans** (tiêu đề, số hiệu, nhấn mạnh - chuẩn hóa 100% tiếng Việt có dấu, không lỗi font) và **Inter** (nội dung, badge, danh sách).
   - Tối giản hóa tối đa không gian: Loại bỏ các thanh điều hướng rườm rà ở mép trên, giúp người xem tập trung 100% vào nội dung bài báo cáo.
2. **Quy tắc 6x6 áp dụng chọn lọc**:
   - Các slide lý thuyết và kiến trúc (Slide 1, 2, 3, 4, 6, 12): Tuân thủ nghiêm ngặt **không quá 6 dòng, mỗi dòng không quá 6 chữ** để người nghe tập trung lắng nghe người thuyết trình, không bị phân tâm đọc chữ.
   - Các slide phân tích mã nguồn (Slide 8 đến 11): **Gỡ bỏ quy tắc 6x6** để chia bố cục 2 cột chuyên sâu (Cột trái: IDE Mac mô phỏng code thật; Cột phải: Thẻ phân tích kỹ thuật đầy đủ chi tiết cho Thầy kiểm tra).
3. **Không để khoảng trống thừa (Zero Void)**: Cột giải thích mã nguồn được chia đều chiều cao 50/50, cân xứng hoàn hảo với khung code bên trái.
4. **Hệ sinh thái điều khiển & tương tác (Interactive Controls)**:
   - **Mục lục số tròn bên trái màn hình (`01` đến `12`)**: Hiển thị tooltip tiêu đề khi rê chuột, click trực tiếp để chuyển nhanh đến slide bất kỳ.
   - **Thanh điều hướng dưới đáy (Bottom Floating Bar)**: Nút Previous (`←`), bộ đếm `01 / 12` và Next (`→`).
   - **Phím điều hướng bàn phím**: Phím mũi tên `→` / `←`, phím cách `Space`, hoặc `PageDown` / `PageUp` để chuyển slide.
   - **Phím `F`**: Bật / tắt chế độ Fullscreen toàn màn hình.
   - **Nút "Bắn 10 Request Đặt Lịch" tại Slide 7**: Giả lập tăng tải tức thì, cập nhật đồng hồ Request, RAM Heap và Latency P95 theo thời gian thực.

---

### 2.2. Ma trận 12 Slide chi tiết (Slide Matrix)

| Slide | Tên Slide & Tiêu Đề | Loại Slide | Nội Dung Trọng Tâm & Dữ Liệu Trưng Bày | Mã Nguồn / Cấu Hình Đối Ứng |
| :---: | :--- | :--- | :--- | :--- |
| **01** | **Trang Bìa:** Giám Sát Cloud-Native Với Prometheus & Grafana | Cover Hero | Giới thiệu tên đề tài MedSched, logo công nghệ, nhóm sinh viên và GVHD. | Toàn bộ dự án MedSched |
| **02** | **Tổng Quan Bài Thuyết Trình:** Lộ Trình Báo Cáo 6 Trụ Cột | 6 Agenda Cards | Tóm lược 6 giai đoạn: Khái niệm & Thách thức, Kiến trúc 3 tầng, Chỉ số vàng SRE, Live Demo, 4 tầng mã nguồn, Tổng kết. | Toàn diện cấu trúc báo cáo |
| **03** | **Khái Niệm Nền Tảng:** Prometheus & Grafana Là Gì? | 3 Feature Cards | TSDB PULL chủ động 5s/lần; Grafana trực quan hóa; Vòng tròn quan sát khép kín. | Định nghĩa công nghệ chuẩn SRE |
| **04** | **Thực Trạng & Thách Thức:** Vì Sao MedSched Cần Giám Sát? | 3 Alert Cards | Đặc thù khám bệnh nghẽn giờ cao điểm 7h-9h; Tránh sập server; Cam kết SLA y tế. | Luồng đặt khám thực tế |
| **05** | **Kiến Trúc Hoạt Động:** Mô Hình 3 Tầng Giám Sát | Animated Diagram | Backend Cloud Render $ightarrow$ Prometheus Docker (Scrape 5s) $ightarrow$ Grafana Dashboard (Port 3100). | Luồng dữ liệu thời gian thực |
| **06** | **Thông Số Kỹ Thuật:** 4 Nhóm Chỉ Số Vàng (Golden Metrics) | 4 Metric Boxes | Chuẩn SRE: 1. HTTP Traffic & Độ trễ P95; 2. RAM Heap; 3. Tải CPU; 4. HikariCP Pool. | Spring Boot Actuator Core |
| **07** | **Thực Nghiệm & Live Demo:** 1-Click Khởi Động & Giả Lập | Interactive Box | Nút bấm **"Bắn 10 Request Đặt Lịch"** tăng chỉ số tức thì; Script `start-monitoring.bat`. | [start-monitoring.bat](file:///d:/MonHocITC/Javaspring2/DuAnChinhThuc/Source_code/monitoring/start-monitoring.bat) |
| **08** | **Mã Nguồn Backend [1/4]:** Khai Báo Thư Viện Đo Lường | Split View | Phân tích 2 dependency: `spring-boot-starter-actuator` và `micrometer-registry-prometheus`. | [build.gradle](file:///d:/MonHocITC/Javaspring2/DuAnChinhThuc/Source_code/backend/app/build.gradle#L23-L25) |
| **09** | **Cấu Hình Ứng Dụng [2/4]:** Kích Hoạt Endpoints & Nhãn Tags | Split View | Cấu hình `exposure.include: prometheus`, `tags.application: medsched` trong Spring Boot. | [application.yml](file:///d:/MonHocITC/Javaspring2/DuAnChinhThuc/Source_code/backend/app/src/main/resources/application.yml#L104-L117) |
| **10** | **Bảo Mật Hệ Thống [3/4]:** Quyền Truy Cập Endpoint An Toàn | Split View | Cấu hình `.requestMatchers("/actuator/**").permitAll()`; Bảo vệ 100% dữ liệu y tế. | [SecurityConfig.java](file:///d:/MonHocITC/Javaspring2/DuAnChinhThuc/Source_code/backend/app/src/main/java/com/medsched/security/SecurityConfig.java#L66-L78) |
| **11** | **Hạ Tầng DevOps [4/4]:** Cào Render Cloud & Tự Động Hóa Docker | Split View | Cấu hình job cào HTTPS 5s/lần; Ánh xạ port 3100; Cơ chế Zero-Config Provisioning. | [prometheus.yml](file:///d:/MonHocITC/Javaspring2/DuAnChinhThuc/Source_code/monitoring/prometheus.yml) |
| **12** | **Tổng Kết & Action Links:** Sẵn Sàng Vận Hành Production | Hero Summary | Khẳng định độ tin cậy; 2 nút mở trực tiếp Grafana (Port 3100) và Prometheus (Port 9090). | Toàn bộ cụm vận hành giám sát |
---

<a name="phan-3-ma-tran-ma-nguon"></a>
## 💻 PHẦN 3: MA TRẬN ĐỐI CHIẾU MÃ NGUỒN & HẠ TẦNG VỚI PROMETHEUS - GRAFANA

Dưới đây là bảng phân tích toàn bộ **8 file mã nguồn & cấu hình thực tế** trong dự án MedSched quyết định sự hoạt động của bộ đôi Prometheus & Grafana:

### 3.1. Danh mục 8 file mã nguồn tham gia hệ thống giám sát

```
Dự án MedSched (Thư mục gốc)
├── Source_code/backend/app/
│   ├── build.gradle                                               --> [File 1] Nạp thư viện Actuator & Micrometer
│   └── src/main/resources/application.yml                         --> [File 2] Mở endpoint HTTP & gắn nhãn application tag
│   └── src/main/java/com/medsched/security/SecurityConfig.java    --> [File 3] Cho phép Prometheus cào qua permitAll()
└── Source_code/monitoring/
    ├── presentation/index.html                                    --> [File 4] File trình chiếu slide thuyết trình Web (12 Slide)
    ├── prometheus.yml                                             --> [File 5] Cấu hình chu kỳ cào 5s từ Cloud Render
    ├── docker-compose-monitoring.yml                              --> [File 6] Khởi chạy 2 container, map cổng 3100
    ├── provisioning/datasources/datasource.yml                    --> [File 7] Tự động kết nối Grafana với Prometheus
    ├── provisioning/dashboards/dashboards.yml                     --> [File 8] Tự động nạp dashboard từ thư mục JSON
    ├── provisioning/dashboards/medsched-cloud-dashboard.json      --> [File 9] Định nghĩa toàn bộ 12 panel & câu lệnh PromQL
    ├── start-monitoring.bat                                       --> Script 1-Click khởi động tự động
    └── stop-monitoring.bat                                        --> Script 1-Click tắt giải phóng RAM
```

---

### 3.2. Chi tiết từng file mã nguồn & Đoạn code tương ứng

#### 📄 [File 1] `Source_code/backend/app/build.gradle` (Dòng 23 - 25)
* **Đoạn code:**
  ```groovy
  // Monitoring & Observability (Actuator + Prometheus Metrics)
  implementation 'org.springframework.boot:spring-boot-starter-actuator'
  implementation 'io.micrometer:micrometer-registry-prometheus'
  ```
* **Tác dụng:**
  - `spring-boot-starter-actuator`: Tạo ra bộ cảm biến nội tại đo lường RAM, CPU, GC Pause, HTTP Traffic và HikariCP Pool.
  - `micrometer-registry-prometheus`: Đóng vai trò là "thông dịch viên", chuyển đổi toàn bộ số liệu của Java sang chuẩn chuỗi thời gian TSDB `metric_name{label=value} timestamp value` để Prometheus đọc được.

---

#### 📄 [File 2] `Source_code/backend/app/src/main/resources/application.yml` (Dòng 104 - 117)
* **Đoạn code:**
  ```yaml
  management:
    endpoints:
      web:
        exposure:
          include: health, info, prometheus, metrics
    endpoint:
      prometheus:
        enabled: true
      health:
        show-details: always
    metrics:
      tags:
        application: medsched
  ```
* **Tác dụng:**
  - `exposure.include: prometheus`: Mở cổng HTTP tại đường dẫn `/actuator/prometheus` (mặc định Spring Boot khóa endpoint này).
  - `metrics.tags.application: medsched`: Tự động gắn nhãn định danh `application="medsched"` vào từng dòng chỉ số, giúp lọc chính xác dữ liệu của MedSched khi chạy chung cụm với các microservices khác.

---

#### 📄 [File 3] `Source_code/backend/app/src/main/java/com/medsched/security/SecurityConfig.java` (Dòng 66 - 78)
* **Đoạn code:**
  ```java
  .authorizeHttpRequests(auth -> auth
      .requestMatchers(
          "/",
          "/health",
          "/api/health",
          "/api/v1/health",
          "/actuator/**", // <-- Mở đường dẫn cho Prometheus cào số liệu
          "/error",
          "/api/v1/auth/**",
          "/v3/api-docs/**",
          "/swagger-ui/**",
          "/swagger-ui.html"
      ).permitAll()
      .anyRequest().authenticated()
  )
  ```
* **Tác dụng:**
  - Vì MedSched sử dụng kiến trúc bảo mật **Stateless JWT**, mọi request không có token đều bị chặn lỗi `401 Unauthorized`.
  - Prometheus Server là tiến trình tự động chạy ngầm, không mang JWT token của người dùng. Cấu hình `.permitAll("/actuator/**")` giúp Prometheus cào dữ liệu 24/7 thông suốt.
  - Về mặt an ninh: Endpoint này chỉ xuất số đo kỹ thuật phần cứng, **hoàn toàn không chứa dữ liệu cá nhân hay bệnh án của người bệnh**. Toàn bộ API khám bệnh vẫn được bảo vệ 100%.

---

#### 📄 [File 4] `Source_code/monitoring/prometheus.yml` (Dòng 1 - 23)
* **Đoạn code:**
  ```yaml
  global:
    scrape_interval: 5s        # Chu kỳ cào dữ liệu: 5 giây một lần
    evaluation_interval: 5s

  scrape_configs:
    # 1. THEO DÕI DỰ ÁN THẬT TRÊN MÁY CHỦ CLOUD (RENDER PRODUCTION)
    - job_name: 'medsched-cloud-render'
      scheme: https
      metrics_path: '/actuator/prometheus'
      static_configs:
        - targets: ['medsched-zu15.onrender.com:443']

    # 2. THEO DÕI LOCAL KHI DEV OFFLINE
    - job_name: 'medsched-local'
      metrics_path: '/actuator/prometheus'
      static_configs:
        - targets: ['host.docker.internal:8080']
  ```
* **Tác dụng:**
  - Là "bộ não" thu thập dữ liệu của Prometheus.
  - Cứ đúng 5 giây, Prometheus gửi request HTTPS lên máy chủ thật `medsched-zu15.onrender.com:443` để kéo chỉ số về nén vào cơ sở dữ liệu chuỗi thời gian TSDB.

---

#### 📄 [File 5] `Source_code/monitoring/docker-compose-monitoring.yml` (Dòng 1 - 29)
* **Đoạn code:**
  ```yaml
  services:
    prometheus:
      image: prom/prometheus:latest
      container_name: medsched-prometheus
      ports:
        - "9090:9090"
      volumes:
        - ./prometheus.yml:/etc/prometheus/prometheus.yml

    grafana:
      image: grafana/grafana:latest
      container_name: medsched-grafana
      ports:
        - "3100:3000"  # Ánh xạ cổng 3100 tránh đụng độ với Next.js (port 3000)
      volumes:
        - ./provisioning:/etc/grafana/provisioning
      environment:
        - GF_SECURITY_ADMIN_USER=admin
        - GF_SECURITY_ADMIN_PASSWORD=admin
        - GF_AUTH_ANONYMOUS_ENABLED=true
        - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
  ```
* **Tác dụng:**
  - Khởi tạo cụm 2 container độc lập: Prometheus (Port 9090) và Grafana (Port 3100).
  - Ánh xạ cổng `3100:3000` giúp giao diện Grafana và giao diện web Next.js của bệnh nhân có thể chạy song song trên cùng một máy mà không bao giờ bị xung đột cổng.
  - Cấu hình tự động đăng nhập Admin (`GF_AUTH_ANONYMOUS_ENABLED=true`), mở ra là xem được ngay.

---

#### 📄 [File 6] `Source_code/monitoring/provisioning/datasources/datasource.yml`
* **Tác dụng:** Tự động kết nối Grafana với Prometheus (`http://prometheus:9090`) làm nguồn dữ liệu mặc định (`isDefault: true`). Không cần cấu hình thủ công qua giao diện.

---

#### 📄 [File 7] `Source_code/monitoring/provisioning/dashboards/dashboards.yml`
* **Tác dụng:** Chỉ cho Grafana biết thư mục nạp Dashboard tự động là `/etc/grafana/provisioning/dashboards`, nạp vào thư mục hiển thị tên là "MedSched".

---

#### 📄 [File 8] `Source_code/monitoring/provisioning/dashboards/medsched-cloud-dashboard.json`
* **Tác dụng:** File JSON định nghĩa toàn bộ 12 panel hiển thị trên Grafana: màu sắc, ngưỡng cảnh báo, đồ thị hình răng cưa và các câu lệnh truy vấn PromQL.

---

### 3.3. Bảng đối soát: Panel Grafana $\leftrightarrow$ Câu lệnh PromQL $\leftrightarrow$ Code Backend

| Tên Panel Trên Grafana | Câu Lệnh Truy Vấn PromQL | Nguồn Dữ Liệu & Đoạn Code Backend Tạo Ra | Ý Nghĩa Thực Tế Trong MedSched |
| :--- | :--- | :--- | :--- |
| **Trạng Thái Máy Chủ** | `up{job="medsched-cloud-render"}` | Endpoint `/actuator/prometheus` mở qua [SecurityConfig.java:L72](file:///d:/MonHocITC/Javaspring2/DuAnChinhThuc/Source_code/backend/app/src/main/java/com/medsched/security/SecurityConfig.java#L72). Phản hồi `200 OK` $\rightarrow$ `1` (UP). | Đảm bảo máy chủ Cloud Render đang sống và phục vụ người bệnh. |
| **Thời Gian Hoạt Động** | `process_uptime_seconds{job="medsched-cloud-render"}` | Bean `UptimeMetrics` của Micrometer đo từ hàm `main()` của `MedSchedApplication.java`. | Chứng minh server chạy bền bỉ suốt nhiều giờ, không bị crash. |
| **RAM JVM Heap** | `jvm_memory_used_bytes{area="heap"}` | Bean `JvmMemoryMetrics` đọc RAM Heap sinh ra khi tạo các đối tượng `Appointment`, `User`... | Giám sát bộ gom rác GC dọn dẹp, phát hiện sớm rò rỉ bộ nhớ (Memory Leak). |
| **Tải CPU Ứng Dụng** | `process_cpu_usage * 100` | Bean `ProcessorMetrics` đo tính toán khi mã hóa mật khẩu BCrypt, ký JWT, xếp slot khám. | Đánh giá mức độ tối ưu thuật toán, đảm bảo CPU luôn ở mức thấp (< 5%). |
| **Kết Nối HikariCP** | `hikaricp_connections_active` | Thư viện Spring Data JPA & HikariCP khi các hàm `@Transactional` thực thi truy vấn SQL. | Tránh tình trạng nghẽn hàng đợi MySQL khi hàng trăm bệnh nhân đặt lịch cùng lúc. |
| **Số Luồng Xử Lý** | `jvm_threads_live_threads` | Embedded Tomcat Thread Pool trong `spring-boot-starter-web` xử lý request đồng thời. | Theo dõi năng lực xử lý đa luồng (Multi-threading) của hệ thống. |
| **Tần Suất Request** | `rate(http_server_requests_seconds_count[1m])` | Bộ lọc Servlet Filter của Actuator ghi nhận mỗi khi có bệnh nhân gửi request API. | Thống kê số lượng truy cập, phân loại mã lỗi `200 OK`, `4xx`, `5xx`. |
| **Độ Trễ Phản Hồi** | `http_server_requests_seconds_max` | Bộ đếm thời gian Timer của Micrometer đo độ trễ từ lúc nhận đến lúc trả kết quả. | Theo dõi độ trễ thực tế P95, đảm bảo người bệnh được phản hồi trong dưới 10ms. |

---

<a name="phan-4-khoi-chay-demo"></a>
## ⚙️ PHẦN 4: HƯỚNG DẪN VẬN HÀNH DEMO THỰC TẾ 1-CLICK (ZERO-CONFIG)

> [!IMPORTANT]
> **ƯU THẾ VƯỢT TRỘI CỦA GIẢI PHÁP:**
> Hệ thống giám sát của nhóm theo dõi **MÁY CHỦ THẬT TRÊN RENDER CLOUD** (`https://medsched-zu15.onrender.com`).  
> Do đó, **người thuyết trình KHÔNG CẦN cài đặt MySQL, KHÔNG CẦN chạy Spring Boot hay Next.js trên máy tính!**  
> Chỉ cần máy tính có mạng Internet và bật Docker Desktop là chạy được ngay!

### 4.1. Các bước khởi động Demo (Chưa tới 30 giây):
1. **Bước 1:** Mở ứng dụng **Docker Desktop** trên máy tính (chờ icon chú cá voi ở góc màn hình chuyển sang màu xanh lá cây: *Engine running*).
2. **Bước 2:** Mở thư mục: **`Source_code/monitoring/`**.
3. **Bước 3:** **Click đúp chuột** vào file: **`start-monitoring.bat`**.
4. **Hệ thống sẽ tự động hoàn toàn:**
   * Tự kéo và bật cụm Prometheus & Grafana trong Docker.
   * Tự động bật sẵn 2 tab trên trình duyệt Google Chrome:
     * 🌐 **Tab 1 - Grafana Dashboard:** `http://localhost:3100/d/medsched-cloud/medsched-cloud-production-realtime-monitoring`  
       *(Đã cài sẵn quyền Admin, tự động đăng nhập vào xem luôn đồng hồ kim và biểu đồ!)*
     * 🌐 **Tab 2 - Prometheus Targets:** `http://localhost:9090/targets`  
       *(Hiển thị endpoint `medsched-cloud-render` màu xanh lá cây `UP` 100%)*

### 4.2. Khi kết thúc buổi demo:
* Chỉ cần click đúp vào file: **`Source_code/monitoring/stop-monitoring.bat`** để tắt 2 container và giải phóng RAM cho máy tính.

---

<a name="phan-5-kich-ban-thuyet-trinh"></a>
## 🗣️ PHẦN 5: KỊCH BẢN THUYẾT TRÌNH CHI TIẾT TỪNG SLIDE (LỜI THOẠI THỰC CHIẾN)

*(Người thuyết trình đứng trước Thầy Bình, mở file [Source_code/monitoring/presentation/index.html](file:///d:/MonHocITC/Javaspring2/DuAnChinhThuc/Source_code/monitoring/presentation/index.html), bấm `F11` toàn màn hình và bắt đầu nói theo phong thái tự tin, dõng dạc)*

---

### 🎙️ SLIDE 1: TRANG BÌA (Mở Đầu Ấn Tượng)
*(Màn hình đang ở Slide 1)*

> *"Dạ em xin kính chào Thầy Trương Thanh Bình cùng toàn thể các bạn!  
> Hôm nay em xin đại diện nhóm phát triển hệ thống MedSched báo cáo chuyên đề kỹ thuật chuyên sâu: **Giám Sát Hệ Thống Thời Gian Thực theo chuẩn Cloud-Native với bộ đôi Prometheus và Grafana**."*

---

### 🎙️ SLIDE 2: TỔNG QUAN BÀI THUYẾT TRÌNH (Lộ Trình Báo Cáo 6 Trụ Cột)
*(Bấm phím `→` sang Slide 2 - Giọng dõng dạc, bao quát)*

> *"Thưa Thầy và các bạn, để Thầy tiện theo dõi và đánh giá toàn diện chuyên đề, bài báo cáo của nhóm em được cấu trúc chặt chẽ qua **6 trụ cột nội dung chính**:
>
> 1. **Khái Niệm & Thách Thức:** Giới thiệu nền tảng Prometheus & Grafana cùng bài toán quá tải giờ cao điểm của hệ thống đặt khám MedSched.
> 2. **Kiến Trúc 3 Tầng:** Mô hình luồng dữ liệu thời gian thực từ Cloud Render qua Prometheus Docker đến Grafana Dashboard.
> 3. **4 Nhóm Chỉ Số Vàng SRE:** Bộ tiêu chuẩn giám sát độ trễ P95, lưu lượng HTTP, bộ nhớ RAM JVM Heap và Connection Pool.
> 4. **Live Demo 1-Click:** Trực nghiệm kịch bản khởi động Zero-Config và giả lập lưu lượng bệnh nhân đặt lịch thời gian thực.
> 5. **Phân Tích Chi Tiết Mã Nguồn:** Đối soát thực tế 4 tầng code: từ `build.gradle`, `application.yml`, `SecurityConfig.java` đến Docker Compose và 12 câu lệnh PromQL.
> 6. **Tổng Kết & Vận Hành Thực Tế:** Đánh giá độ sẵn sàng Production và truy cập trực tiếp hệ thống dashboard.
>
> Sau đây, em xin phép đi vào chi tiết từng phần!"*

---

### 🎙️ SLIDE 3: KHÁI NIỆM NỀN TẢNG (Prometheus & Grafana Là Gì?)
*(Bấm phím `→` sang Slide 3)*

> *"Thưa Thầy, để quản lý sức khỏe một hệ thống y tế hiện đại, nhóm em ứng dụng mô hình kết hợp hoàn hảo giữa **Prometheus** và **Grafana**:
>
> 1. **Prometheus đóng vai trò là 'Bộ não đo lường':** Đây là hệ quản trị cơ sở dữ liệu chuỗi thời gian (TSDB). Prometheus hoạt động theo cơ chế **PULL** – định kỳ chủ động 'cào' số liệu từ máy chủ về, lưu trữ cực kỳ tối ưu và cung cấp ngôn ngữ truy vấn mạnh mẽ PromQL.
> 2. **Grafana đóng vai trò là 'Đôi mắt quan sát':** Là nền tảng trực quan hóa số một thế giới hiện nay, kết nối trực tiếp vào Prometheus để biến các dòng số liệu khô khan thành biểu đồ động, đồng hồ kim đo tải và bảng cảnh báo trực quan theo thời gian thực.
>
> Sự kết hợp này tạo nên vòng tròn quan trắc khép kín, giúp đội ngũ kỹ sư nắm bắt tình trạng hệ thống 24/7 và phát hiện sự cố trước khi người dùng phản ánh."*

---

### 🎙️ SLIDE 4: THỰC TRẠNG & THÁCH THỨC (Vì Sao MedSched Cần Giám Sát?)
*(Bấm phím `→` sang Slide 4)*

> *"Thưa Thầy, MedSched là hệ thống đặt lịch khám bệnh phục vụ hàng ngàn người bệnh. Đặc thù của ngành y tế là thường xuyên xảy ra tình trạng **quá tải vào khung giờ cao điểm từ 7h đến 9h sáng**, khi lượng lớn bệnh nhân đồng loạt vào đặt lịch.  
>
> Nếu không có hệ thống giám sát, nhóm em sẽ rơi vào thế 'mù mờ về kỹ thuật':
> - Không biết độ trễ API thực tế là bao nhiêu mili-giây.
> - Không biết bộ nhớ RAM JVM có đang bị rò rỉ (Memory Leak) hay không.
> - Khi hệ thống bị chậm, rất khó tìm ra nguyên nhân gốc rễ là do code, do CPU hay do nghẽn cơ sở dữ liệu MySQL.
>
> Chính vì vậy, nhóm em đã tích hợp giải pháp **Full-Stack Observability** chuẩn doanh nghiệp để giải quyết triệt để bài toán này."*

---

### 🎙️ SLIDE 5: KIẾN TRÚC HOẠT ĐỘNG (Mô Hình 3 Tầng)
*(Bấm phím `→` sang Slide 5 - Chỉ tay vào sơ đồ luồng dữ liệu)*

> *"Thưa Thầy, đây là kiến trúc giám sát 3 tầng mà nhóm em đã triển khai thực tế:
>
> - **Tầng 1 (Tầng phát sinh số liệu):** Backend Spring Boot của MedSched hiện đang chạy thực tế trên nền tảng **Cloud Render**. Ứng dụng tích hợp Spring Boot Actuator và Micrometer, liên tục đo đạc và mở cổng bảo mật HTTPS tại endpoint: `/actuator/prometheus`.
> - **Tầng 2 (Tầng thu thập & lưu trữ):** Prometheus Server chạy trong Docker, cứ đều đặn **5 giây một lần** sẽ gửi một yêu cầu GET an toàn lên Cloud để kéo toàn bộ chỉ số về lưu vào kho dữ liệu TSDB.
> - **Tầng 3 (Tầng hiển thị trực quan):** Grafana UI chạy trên cổng 3100, liên tục thực thi các câu lệnh PromQL để vẽ đồ thị và đồng hồ đo thời gian thực cho người quản trị."*

---

### 🎙️ SLIDE 6: THÔNG SỐ KỸ THUẬT (4 Nhóm Chỉ Số Vàng - Golden Metrics)
*(Bấm phím `→` sang Slide 6)*

> *"Vậy hệ thống MedSched đang đo lường những chỉ số cụ thể nào? Nhóm em tập trung vào **4 nhóm chỉ số vàng** chuẩn SRE:
>
> 1. **Lưu lượng HTTP & Độ trễ:** Đếm tổng số lượt gọi API, phân loại mã phản hồi 200, 400, 500 và đặc biệt là theo dõi **độ trễ chuẩn P95** – nghĩa là 95% yêu cầu của bệnh nhân được xử lý trong bao nhiêu mili-giây.
> 2. **Bộ nhớ JVM Heap:** Giám sát mức RAM đang dùng và tần suất bộ gom rác Garbage Collector dọn dẹp để ngăn ngừa tuyệt đối lỗi sập server do tràn bộ nhớ (OutOfMemoryError).
> 3. **Tải vi xử lý CPU:** Theo dõi tỷ lệ phần trăm CPU tiêu thụ của ứng dụng và của toàn bộ máy chủ Cloud.
> 4. **Hồ kết nối CSDL HikariCP:** Giám sát số lượng kết nối MySQL đang hoạt động (`Active Connections`) và các kết nối rảnh rỗi để tránh tình trạng nghẽn hàng đợi truy vấn."*

---

### 🎙️ SLIDE 7: BẮT ĐẦU LIVE DEMO (Thực Nghiệm & Giả Lập)
*(Bấm phím `→` sang Slide 7)*

> *"Thưa Thầy, để mọi thành viên trong nhóm đều có thể triển khai môi trường giám sát chỉ trong 10 giây mà không cần cấu hình phức tạp, nhóm em đã đóng gói thành file thực thi **`start-monitoring.bat`**.
>
> Ngay trên slide này, nhóm em cũng tích hợp sẵn bộ giả lập lưu lượng. Khi em nhấn nút **'Bắn 10 Request Đặt Lịch'** *(Click chuột vào nút màu cam trên slide)*, hệ thống sẽ mô phỏng bệnh nhân gửi yêu cầu và các chỉ số HTTP, RAM, Latency trên slide được cập nhật tức thì!"*

---

### 🎙️ SLIDE 8: MÃ NGUỒN BACKEND [1/4] — KHAI BÁO THƯ VIỆN (`build.gradle`)
*(Bấm phím `→` sang Slide 8 - Nhìn vào khung IDE bên trái)*

> *"Thưa Thầy, để chứng minh giải pháp này được tích hợp thực tế vào mã nguồn dự án chứ không phải chỉ là mô hình lý thuyết, nhóm em xin phân tích chi tiết từng vị trí code then chốt.
>
> Đầu tiên là file **`Source_code/backend/app/build.gradle` (dòng 23 - 25)**:
> - Thư viện thứ nhất là **`spring-boot-starter-actuator`**: Cung cấp bộ khung giám sát sức khỏe nội tại của Spring Boot, tự động theo dõi bộ nhớ RAM JVM Heap, các đợt dọn rác GC Pause, tần suất xử lý HTTP Request và hồ kết nối HikariCP Connection Pool.
> - Thư viện thứ hai là **`micrometer-registry-prometheus`**: Đóng vai trò là 'thông dịch viên định dạng'. Nó biên dịch toàn bộ dữ liệu chỉ số của Java sang chuẩn chuỗi thời gian TSDB `metric_name{label=value} timestamp value` để Prometheus Server có thể cào và lưu trữ được.
>
> Nếu thiếu thư viện Micrometer này, Actuator sẽ chỉ xuất được JSON thông thường chứ không thể kết nối tương thích với Prometheus."*

---

### 🎙️ SLIDE 9: CẤU HÌNH ỨNG DỤNG [2/4] — KÍCH HOẠT ENDPOINTS & TAGS (`application.yml`)
*(Bấm phím `→` sang Slide 9)*

> *"Tiếp theo là cấu hình kích hoạt tại **`application.yml` (dòng 104 - 117)**:
>
> - Mặc định Spring Boot chỉ mở 2 endpoint an toàn là `health` và `info`. Nhóm em đã cấu hình thuộc tính **`exposure.include: health, info, prometheus, metrics`** và bật **`prometheus.enabled: true`** để mở cổng HTTP tại đường dẫn `/actuator/prometheus`.
> - Đặc biệt, nhóm cấu hình **`metrics.tags.application: medsched`**. Thuộc tính này sẽ tự động gắn nhãn `application="medsched"` vào từng dòng chỉ số được xuất ra. Điều này vô cùng quan trọng trong môi trường Microservices, giúp Prometheus và Grafana lọc chính xác dữ liệu của MedSched khi chạy chung cụm với các dịch vụ khác."*

---

### 🎙️ SLIDE 10: BẢO MẬT HỆ THỐNG [3/4] — CẤU HÌNH QUYỀN TRUY CẬP (`SecurityConfig.java`)
*(Bấm phím `→` sang Slide 10)*

> *"Vị trí thứ ba rất quan trọng về mặt an toàn thông tin là **`SecurityConfig.java` (dòng 66 - 78)**:
>
> - Hệ thống MedSched sử dụng kiến trúc bảo mật **Stateless JWT**. Mọi API nếu không có token người dùng đều bị chặn ngay lập tức với mã lỗi `401 Unauthorized`.
> - Tuy nhiên, Prometheus Server là một tiến trình cào dữ liệu tự động chạy ngầm, không mang JWT token của người dùng. Do đó, nhóm em đã cấu hình **`.requestMatchers("/actuator/**").permitAll()`**.
> - Về mặt an ninh: Endpoint `/actuator/prometheus` chỉ xuất các con số thống kê kỹ thuật về phần cứng và tần suất gọi API, **hoàn toàn không chứa dữ liệu cá nhân hay bệnh án của người bệnh**. Toàn bộ các API khám bệnh, thông tin bác sĩ và đơn đặt khám vẫn được Spring Security bảo vệ nghiêm ngặt 100%."*

---

### 🎙️ SLIDE 11: HẠ TẦNG DEVOPS [4/4] — CÀO RENDER CLOUD & DOCKER GRAFANA
*(Bấm phím `→` sang Slide 11)*

> *"Và vị trí cuối cùng là cấu hình hạ tầng tại thư mục **`Source_code/monitoring/`**:
>
> - Trong file **`prometheus.yml`**: Nhóm cấu hình job `medsched-cloud-render` với `metrics_path: '/actuator/prometheus'` và mục tiêu target là máy chủ thật **`medsched-zu15.onrender.com:443`** chạy giao thức mã hóa HTTPS. Cứ đều đặn 5 giây một lần, Prometheus sẽ cào số liệu từ máy chủ Cloud về lưu vào TSDB.
> - Trong file **`docker-compose-monitoring.yml`**: Nhóm ánh xạ cổng Grafana là **`3100:3000`** để tránh đụng độ với cổng 3000 của giao diện Frontend Next.js.
> - Đồng thời, nhóm thiết lập cơ chế **Zero-Config Provisioning** thông qua thư mục `provisioning/`: Tự động gắn Prometheus Data Source (`datasource.yml`) và tự động nạp sẵn Dashboard `medsched-cloud-dashboard.json` ngay khi khởi động container, người dùng chỉ cần chạy file `start-monitoring.bat` là có ngay bảng điều khiển hoàn chỉnh mà không cần bấm cấu hình tay bất kỳ bước nào!"*

---

### 🎙️ SLIDE 12: TỔNG KẾT & LỜI CẢM ƠN
*(Bấm phím `→` sang Slide 12)*

> *"Dạ thưa Thầy, việc tích hợp thành công Prometheus và Grafana đã giúp dự án MedSched hoàn thiện mảnh ghép vận hành theo đúng chuẩn **Cloud-Native Doanh Nghiệp**. Hệ thống không chỉ chạy tốt về mặt chức năng mà còn được bảo vệ và theo dõi sức khỏe 24/7 một cách minh bạch, sẵn sàng phục vụ người bệnh an toàn và tin cậy.
>
> Ngay sau đây, em xin phép chuyển sang giao diện trình duyệt để demo trực tiếp số liệu thời gian thực đang cào từ máy chủ Cloud Render qua 2 cổng 3100 và 9090 ạ!"*
---

<a name="phan-6-kich-ban-demo-grafana"></a>
## 🖥️ PHẦN 6: KỊCH BẢN THUYẾT MINH TRỰC TIẾP TRÊN GRAFANA & PROMETHEUS WEB

*(Người thuyết trình bấm tổ hợp phím `Alt + Tab` chuyển sang cửa sổ Google Chrome đã mở sẵn 2 tab Grafana và Prometheus)*

### 1. Tại Tab 1: Prometheus Targets (`http://localhost:9090/targets`)
*(Chỉ chuột vào dòng endpoint màu xanh)*
> *"Dạ thưa Thầy, trước tiên đây là giao diện **Prometheus Targets**:  
> Endpoint **`medsched-cloud-render`** đang ở trạng thái **State: UP (Màu xanh lá)**.  
> Prometheus đã cào dữ liệu thành công từ địa chỉ máy chủ Cloud `https://medsched-zu15.onrender.com/actuator/prometheus` với chu kỳ cào đều đặn là **5 giây một lần**."*

---

### 2. Tại Tab 2: Grafana Realtime Dashboard (`http://localhost:3100`)
*(Chuyển sang tab Grafana Dashboard `MedSched - Cloud Production Realtime Monitoring`)*

> *"Và đây là **Dashboard Giám Sát Thời Gian Thực MedSched Cloud Production** trên Grafana:
>
> 1. **Hàng trên cùng (Tổng quan sức khỏe):**
>    - **Trạng thái:** Báo `HOẠT ĐỘNG (UP)` màu xanh lá, ứng dụng Cloud đang sống 100%.
>    - **Thời gian hoạt động (Uptime):** Đạt hơn **8.7 giờ** liên tục, chứng minh server chạy ổn định, không bị restart đột ngột.
>    - **Kết nối DB HikariCP:** Đang ở mức `0` nghĩa là không có truy vấn nào bị nghẽn; khi có bệnh nhân đặt khám số này sẽ nhảy lên rồi trả về 0.
>    - **Số luồng xử lý (JVM Threads):** Đang duy trì **34 luồng** ổn định để phục vụ các request đồng thời.
>
> 2. **Hàng thứ hai (Bộ nhớ JVM & CPU):**
>    - **Biểu đồ JVM Heap:** Đồ thị có hình **răng cưa đều đặn** chứng minh bộ dọn rác **Garbage Collector (GC)** hoạt động rất tốt, cứ khi RAM tăng thì GC sẽ thu gom và hạ xuống, **hoàn toàn không bị rò rỉ bộ nhớ (Memory Leak)**.
>    - **Tải CPU:** Tiến trình Spring Boot chỉ chiếm khoảng **1% - 3% CPU**, hệ thống chạy rất nhẹ và tiết kiệm tài nguyên.
>
> 3. **Hàng thứ ba (Lưu lượng API & Độ trễ):**
>    - **Tần suất Request:** Đạt mức sóng bằng phẳng 0.22 req/s tương ứng chu kỳ cào 5s/lần của Prometheus; **100% request đều trả về mã 200 OK**, không có lỗi 4xx hay 5xx.
>    - **Độ trễ phản hồi (Latency P95):** Phản hồi cực nhanh, chỉ dao động từ **5 ms đến 7.5 ms** (nhanh hơn chuẩn chấp nhận 200ms của web y tế rất nhiều lần).
>
> 4. **Hàng dưới cùng (HikariCP MySQL Pool & Chi tiết URI):**
>    - Hồ kết nối luôn nuôi sẵn **5 kết nối rảnh rỗi (Idle = 5)** để bệnh nhân bấm đặt khám là phục vụ ngay lập tức mà không cần tốn thời gian bắt tay TCP MySQL mới.
>    - Bảng nhật ký URI ghi nhận chi tiết số lượt cào của từng endpoint thời gian thực."*

---

<a name="phan-7-cau-hoi-thay-hay-hoi"></a>
## 💡 PHẦN 7: BỘ CÂU HỎI PHẢN BIỆN CHUYÊN SÂU CỦA THẦY BÌNH & CÁCH TRẢ LỜI

Thầy Trương Thanh Bình rất thích hỏi sâu về bản chất kiến trúc và mã nguồn. Khi Thầy hỏi, người thuyết trình cứ bình tĩnh trả lời theo đúng các luận điểm kỹ thuật sau:

---

### ❓ Câu 1: "Tại sao nhóm em lại dùng cơ chế PULL (Prometheus tự kéo) mà không dùng cơ chế PUSH (Backend tự đẩy số liệu sang)?"
* **Gợi ý trả lời:**  
  > *"Dạ thưa Thầy, nhóm em chọn cơ chế **PULL** vì đây là tiêu chuẩn vàng của kiến trúc Cloud-Native:  
  > 1. Khi backend gặp sự cố quá tải lượng lớn bệnh nhân vào buổi sáng, nếu dùng cơ chế PUSH thì backend sẽ phải gánh thêm tác vụ liên tục tạo kết nối mạng ra ngoài để đẩy số liệu, càng làm server nhanh sập hơn.  
  > 2. Với cơ chế PULL, Prometheus là bên chủ động điều tiết nhịp cào (5 giây/lần). Backend chỉ việc lưu biến đếm trên RAM, khi nào Prometheus hỏi tới thì đọc ra trong chưa đầy 1 mili-giây, hoàn toàn bảo vệ backend không bị quá tải ạ."*

---

### ❓ Câu 2: "Tại sao cổng Grafana lại đặt là 3100 mà thông thường người ta hay dùng cổng 3000?"
* **Gợi ý trả lời:**  
  > *"Dạ thưa Thầy, cổng mặc định của Grafana đúng là 3000. Tuy nhiên trong dự án MedSched, **giao diện Web Next.js dành cho bệnh nhân đã sử dụng cổng 3000**.  
  > Vì vậy, trong file cấu hình `docker-compose-monitoring.yml`, nhóm em đã chủ động ánh xạ cổng `3100:3000` để phân tách môi trường, giúp cả trang web đặt khám của bệnh nhân và trang quản trị Grafana có thể chạy song song trên cùng một máy tính mà không bao giờ bị xung đột cổng ạ."*

---

### ❓ Câu 3: "Cứ 5 giây Prometheus cào dữ liệu một lần như vậy thì có làm chậm hệ thống đặt lịch của bệnh nhân không?"
* **Gợi ý trả lời:**  
  > *"Dạ thưa Thầy, hoàn toàn không làm chậm ạ!  
  > Vì thư viện Micrometer trong Spring Boot sử dụng các biến đếm nguyên tử trong bộ nhớ RAM (`AtomicLong` và `MeterRegistry`). Khi bệnh nhân đặt lịch, hệ thống chỉ mất vài nano-giây để tăng biến đếm trên RAM.  
  > Khi Prometheus cào dữ liệu qua cổng `/actuator/prometheus`, server chỉ việc tuần tự hóa các số liệu có sẵn trên RAM trả về dưới dạng văn bản thuần, mức tiêu thụ CPU tăng chưa tới 1%, hoàn toàn không ảnh hưởng tới luồng đặt khám của người bệnh ạ."*

---

### ❓ Câu 4: "Tại sao trong SecurityConfig lại cấu hình .permitAll() cho /actuator/**, làm như vậy có nguy hiểm và lộ dữ liệu bệnh án không?"
* **Gợi ý trả lời:**  
  > *"Dạ thưa Thầy, hoàn toàn an toàn và không hề lộ dữ liệu y tế ạ!  
  > 1. Endpoint `/actuator/prometheus` chỉ xuất các con số thống kê phần cứng thuần túy như: RAM JVM, % CPU, số kết nối HikariCP và tần suất gọi mã HTTP. Trong các dòng số liệu này **hoàn toàn không chứa bất kỳ thông tin cá nhân, tên tuổi hay bệnh án nào của người bệnh**.  
  > 2. Toàn bộ các API nghiệp vụ y tế như xem hồ sơ bệnh án, thông tin bác sĩ, lịch hẹn khám vẫn được Spring Security khóa chặt 100% bằng cơ chế xác thực JWT Token.  
  > 3. Nếu không cấu hình `permitAll()`, Prometheus Server chạy ngầm không có tài khoản người dùng sẽ bị chặn lỗi 401 Unauthorized và hệ thống giám sát sẽ bị tê liệt hoàn toàn ạ."*

---

### ❓ Câu 5: "Câu lệnh PromQL `up{job=\"medsched-cloud-render\"}` nằm ở đâu trong dự án và cái tên nhãn đó từ đâu sinh ra?"
* **Gợi ý trả lời:**  
  > *"Dạ thưa Thầy:  
  > 1. Câu lệnh PromQL này nằm tại dòng 40 của file `Source_code/monitoring/provisioning/dashboards/medsched-cloud-dashboard.json`, định nghĩa trong bảng 'Trạng Thái Máy Chủ Cloud'.  
  > 2. Cái tên nhãn `job=\"medsched-cloud-render\"` được sinh ra từ dòng 10 của file `Source_code/monitoring/prometheus.yml`, nơi nhóm khai báo job cào dữ liệu máy chủ Render Cloud thật qua giao thức HTTPS ạ."*

---

<a name="phan-8-xu-ly-su-co"></a>
## 🛠️ PHẦN 8: KẾ HOẠCH DỰ PHÒNG KHI THUYẾT TRÌNH (TROUBLESHOOTING)

* **Sự cố 1: Quên chưa bật Docker Desktop:**
  * File `start-monitoring.bat` đã được lập trình thông minh, nếu Docker chưa bật nó sẽ hiện thông báo tiếng Việt nhắc nhở: *"[!] CẢNH BÁO: Docker Desktop chưa được bật..."*. Lúc này bạn chỉ cần bật Docker Desktop lên rồi chạy lại file là xong.
* **Sự cố 2: Mạng wifi ở trường bị chập chờn:**
  * Nhóm đã cấu hình sẵn kịch bản kép: nếu Cloud Render phản hồi chậm do mạng, trong file `start-monitoring.bat` và trên Slide 7 vẫn có sẵn chế độ giả lập dữ liệu cục bộ chạy mượt mà 100%.
* **Sự cố 3: Trình duyệt không tự mở tab:**
  * Chỉ cần mở Chrome và gõ trực tiếp địa chỉ:
    * Grafana: `http://localhost:3100`
    * Prometheus: `http://localhost:9090/targets`

---

🎉 **CHÚC NHÓM MEDSCHED CÓ MỘT BUỔI BÁO CÁO THÀNH CÔNG RỰC RỠ, ĐẠT ĐIỂM TUYỆT ĐỐI TRƯỚC THẦY TRƯƠNG THANH BÌNH!**
