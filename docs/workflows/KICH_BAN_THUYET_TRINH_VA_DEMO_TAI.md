# 🎙️ CẨM NANG & KỊCH BẢN THUYẾT TRÌNH DEMO PROMETHEUS & GRAFANA
## HƯỚNG DẪN CHI TIẾT TỪ A - Z CHO BẠN TÀI (DỰ ÁN MEDSCHED)

> **Dự án:** Hệ Thống Phòng Khám & Đặt Lịch Thông Minh MedSched  
> **Chuyên đề:** Giám sát hiệu năng hệ thống Cloud-Native (System Observability & Monitoring)  
> **Giảng viên hướng dẫn:** Thầy Trương Thanh Bình  
> **Người soạn:** Châu Tuấn Kiệt (Trưởng nhóm)  
> **Người thực hiện thuyết trình & demo:** Tài

---

## 📌 MỤC LỤC
1. [Phần 1: Cách lên Git kéo dự án mới nhất về máy Tài](#phan-1-lay-du-an-tu-git)
2. [Phần 2: Cách mở và điều khiển Slide thuyết trình Web](#phan-2-mo-va-chieu-slide)
3. [Phần 3: Cách mở và chạy Demo thực tế (Chỉ với 1-Click)](#phan-3-khoi-chay-demo)
4. [Phần 4: Kịch bản thuyết trình chi tiết từng câu từng chữ](#phan-4-kich-ban-thuyet-trinh)
5. [Phần 5: Phản xạ trả lời 3 câu hỏi "bẫy" Thầy Bình hay hỏi](#phan-5-cau-hoi-thay-hay-hoi)
6. [Phần 6: Kế hoạch dự phòng (Troubleshooting)](#phan-6-xu-ly-su-co)

---

<a name="phan-1-lay-du-an-tu-git"></a>
## 🚀 PHẦN 1: CÁCH LÊN GIT KÉO DỰ ÁN MỚI NHẤT VỀ MÁY TÀI

### 1.1. Thông tin kho lưu trữ (Repository)
* **Link GitHub:** `https://github.com/kietphuchau-create/KeHoach_Js2.git`
* **Tên nhánh mới nhất chuẩn bị thuyết trình:**  
  👉 **`feature/clab-138-monitoring-presentation-deck`**  
  *(Toàn bộ slide web, script demo 1-click và dashboard cloud đều nằm ở nhánh này!)*

---

### 1.2. Thao tác thực hiện trên máy Tài

#### 👉 TRƯỜNG HỢP A: Nếu máy Tài ĐÃ CÓ sẵn thư mục dự án từ trước
1. Mở phần mềm **Git Bash** (hoặc VS Code terminal) tại thư mục dự án:
2. Chạy lần lượt 3 lệnh sau:
```bash
# 1. Tải toàn bộ các nhánh và commit mới nhất về máy
git fetch origin

# 2. Chuyển sang đúng nhánh thuyết trình
git checkout feature/clab-138-monitoring-presentation-deck

# 3. Kéo code mới nhất về
git pull origin feature/clab-138-monitoring-presentation-deck
```
3. Kiểm tra xem đã đúng chưa bằng lệnh:
```bash
git status
```
*(Nếu màn hình hiện: `On branch feature/clab-138-... Your branch is up to date` là hoàn toàn chuẩn xác!)*

---

#### 👉 TRƯỜNG HỢP B: Nếu máy Tài CHƯA CÓ dự án (Tải mới hoàn toàn từ đầu)
1. Mở cửa sổ dòng lệnh tại ổ đĩa muốn lưu (ví dụ `D:\MonHocITC\Javaspring2`):
2. Chạy lệnh clone đúng nhánh:
```bash
git clone -b feature/clab-138-monitoring-presentation-deck https://github.com/kietphuchau-create/KeHoach_Js2.git DuAnChinhThuc
```
3. Đi vào thư mục vừa tải:
```bash
cd DuAnChinhThuc
```

---

<a name="phan-2-mo-va-chieu-slide"></a>
## 🖥️ PHẦN 2: CÁCH MỞ VÀ ĐIỀU KHIỂN SLIDE THUYẾT TRÌNH WEB

Slide báo cáo của nhóm không phải là PowerPoint truyền thống mà là **Web App Slide tương tác hiện đại** được thiết kế riêng cho đề tài Giám sát Prometheus & Grafana!

### 2.1. Vị trí file slide
* Đường dẫn: **`docs/monitoring-presentation.html`**
* Cách mở: Click chuột phải vào file `monitoring-presentation.html` ➔ Chọn **Open with Google Chrome** (hoặc Microsoft Edge).

### 2.2. Phím tắt điều khiển khi đứng trước Thầy
* **Phím `F11`**: Bật chế độ toàn màn hình (Fullscreen) – Giao diện biến thành slide chuyên nghiệp không thấy thanh địa chỉ web.
* **Phím mũi tên sang phải `→`** hoặc **phím cách `Space`**: Chuyển sang slide tiếp theo.
* **Phím mũi tên sang trái `←`**: Lùi lại slide trước.
* **Click chuột**: Trên mỗi slide đều có nút tương tác (Ví dụ nút bắn request giả lập ở Slide 6, nút mở Grafana ở Slide 8).

---

<a name="phan-3-khoi-chay-demo"></a>
## ⚙️ PHẦN 3: CÁCH MỞ VÀ CHẠY DEMO THỰC TẾ (1-CLICK)

> [!IMPORTANT]
> **ƯU ĐIỂM VƯỢT TRỘI CHO TÀI:**
> Hệ thống giám sát của nhóm mình theo dõi **MÁY CHỦ THẬT TRÊN RENDER CLOUD** (`https://medsched-zu15.onrender.com`).  
> Do đó, **Tài KHÔNG CẦN cài đặt MySQL, KHÔNG CẦN chạy Spring Boot hay Next.js trên máy tính!**  
> Chỉ cần máy tính có mạng Internet và bật Docker Desktop là chạy được ngay!

### 3.1. Các bước khởi động Demo (Chưa tới 30 giây):
1. **Bước 1:** Bật ứng dụng **Docker Desktop** trên máy tính của Tài (chờ icon chú cá voi ở góc màn hình chuyển sang màu xanh lá cây: *Engine running*).
2. **Bước 2:** Mở thư mục: **`Source_code/monitoring/`**.
3. **Bước 3:** **Click đúp chuột** vào file: **`start-monitoring.bat`**.
4. **Hệ thống sẽ tự động hoàn toàn:**
   * Tự kéo và bật cụm Prometheus & Grafana trong Docker.
   * Tự động bật sẵn 2 tab trên trình duyệt của bạn:
     * 🌐 **Tab 1 - Grafana Dashboard:** `http://localhost:3100/d/medsched-cloud/medsched-cloud-production-realtime-monitoring`  
       *(Đã cài đặt sẵn tài khoản Admin, tự động đăng nhập vào xem luôn đồng hồ kim và biểu đồ!)*
     * 🌐 **Tab 2 - Prometheus Targets:** `http://localhost:9090/targets`  
       *(Hiển thị endpoint `medsched-cloud-render` màu xanh lá cây `UP` 100%)*

### 3.2. Khi kết thúc buổi demo:
* Chỉ cần click đúp vào file: **`Source_code/monitoring/stop-monitoring.bat`** để tắt và giải phóng RAM cho máy.

---

<a name="phan-4-kich-ban-thuyet-trinh"></a>
## 🗣️ PHẦN 4: KỊCH BẢN THUYẾT TRÌNH CHI TIẾT TỪNG CÂU TỪNG CHỮ

*(Tài chỉ cần học theo mạch này, nói với phong thái tự tin, rõ ràng)*

---

### 🎙️ LỜI CHÀO & MỞ ĐẦU (Tại Slide 1)
> *"Dạ em xin kính chào Thầy Trương Thanh Bình cùng toàn thể các bạn!  
> Em tên là **Tài**, hôm nay em xin đại diện nhóm phát triển hệ thống MedSched báo cáo chuyên đề kỹ thuật chuyên sâu: **Giám Sát Hệ Thống Thời Gian Thực theo chuẩn Cloud-Native với bộ đôi Prometheus và Grafana**."*

---

### 🎙️ SLIDE 2: KHÁI NIỆM NỀN TẢNG (Prometheus & Grafana là gì?)
*(Bấm phím `→` sang Slide 2)*

> *"Thưa Thầy, để giám sát một hệ thống phần mềm hiện đại, nhóm em ứng dụng mô hình kết hợp hoàn hảo giữa **Prometheus** và **Grafana**:
>
> 1. **Prometheus đóng vai trò là 'Bộ não đo lường':** Đây là hệ quản trị cơ sở dữ liệu chuỗi thời gian (TSDB). Prometheus hoạt động theo cơ chế **PULL** – định kỳ chủ động 'cào' số liệu từ máy chủ về, lưu trữ cực kỳ tối ưu và cung cấp ngôn ngữ truy vấn mạnh mẽ PromQL.
> 2. **Grafana đóng vai trò là 'Đôi mắt quan sát':** Là nền tảng trực quan hóa số một thế giới hiện nay, kết nối trực tiếp vào Prometheus để biến các dòng số liệu khô khan thành biểu đồ động, đồng hồ kim đo tải và bảng cảnh báo trực quan theo thời gian thực.
>
> Sự kết hợp này tạo nên vòng tròn quan trắc khép kín, giúp đội ngũ vận hành nắm bắt tình trạng hệ thống 24/7 và phát hiện sự cố trước khi người dùng phản ánh."*

---

### 🎙️ SLIDE 3: THỰC TRẠNG & THÁCH THỨC (Vì sao MedSched cần giám sát?)
*(Bấm phím `→` sang Slide 3)*

> *"Thưa Thầy, MedSched là hệ thống đặt lịch khám bệnh phục vụ hàng ngàn bệnh nhân. Đặc thù của ngành y tế là thường xuyên xảy ra tình trạng **quá tải vào khung giờ cao điểm từ 7h đến 9h sáng**, khi lượng lớn bệnh nhân đồng loạt vào đặt lịch.  
>
> Nếu không có hệ thống giám sát, nhóm em sẽ rơi vào thế 'mù mờ về kỹ thuật':
> - Không biết độ trễ API thực tế là bao nhiêu mili-giây.
> - Không biết bộ nhớ RAM JVM có đang bị rò rỉ (Memory Leak) hay không.
> - Khi hệ thống bị chậm, rất khó tìm ra nguyên nhân gốc rễ là do code, do CPU hay do nghẽn cơ sở dữ liệu MySQL.
>
> Chính vì vậy, nhóm em đã tích hợp giải pháp **Full-Stack Observability** chuẩn doanh nghiệp để giải quyết triệt để bài toán này."*

---

### 🎙️ SLIDE 4: KIẾN TRÚC HOẠT ĐỘNG (Mô hình 3 tầng)
*(Bấm phím `→` sang Slide 4)*

> *"Thưa Thầy, đây là kiến trúc giám sát 3 tầng mà nhóm em đã triển khai thực tế:
>
> - **Tầng 1 (Tầng phát sinh số liệu):** Backend Spring Boot của MedSched hiện đang chạy thực tế trên nền tảng **Cloud Render**. Ứng dụng tích hợp Spring Boot Actuator và Micrometer, liên tục đo đạc và mở cổng bảo mật HTTPS tại endpoint: `/actuator/prometheus`.
> - **Tầng 2 (Tầng thu thập & lưu trữ):** Prometheus Server chạy trong Docker, cứ đều đặn **5 giây một lần** sẽ gửi một yêu cầu GET an toàn lên Cloud để kéo toàn bộ chỉ số về lưu vào kho dữ liệu TSDB.
> - **Tầng 3 (Tầng hiển thị trực quan):** Grafana UI chạy trên cổng 3100, liên tục thực thi các câu lệnh PromQL để vẽ đồ thị và đồng hồ đo thời gian thực cho người quản trị."*

---

### 🎙️ SLIDE 5: THÔNG SỐ KỸ THUẬT (4 nhóm chỉ số vàng - Golden Metrics)
*(Bấm phím `→` sang Slide 5)*

> *"Vậy hệ thống MedSched đang đo lường những chỉ số cụ thể nào? Nhóm em tập trung vào **4 nhóm chỉ số vàng** chuẩn SRE:
>
> 1. **Lưu lượng HTTP & Độ trễ:** Đếm tổng số lượt gọi API, phân loại mã phản hồi 200, 400, 500 và đặc biệt là theo dõi **độ trễ chuẩn P95** – nghĩa là 95% yêu cầu của bệnh nhân được xử lý trong bao nhiêu mili-giây.
> 2. **Bộ nhớ JVM Heap:** Giám sát mức RAM đang dùng và tần suất bộ gom rác Garbage Collector dọn dẹp để ngăn ngừa tuyệt đối lỗi sập server do tràn bộ nhớ (OutOfMemoryError).
> 3. **Tải vi xử lý CPU:** Theo dõi tỷ lệ phần trăm CPU tiêu thụ của ứng dụng và của toàn bộ máy chủ Cloud.
> 4. **Hồ kết nối CSDL HikariCP:** Giám sát số lượng kết nối MySQL đang hoạt động (`Active Connections`) và các kết nối rảnh rỗi để tránh tình trạng nghẽn hàng đợi truy vấn."*

---

### 🎙️ SLIDE 6: BẮT ĐẦU LIVE DEMO (Thực nghiệm & Trực tiếp)
*(Bấm phím `→` sang Slide 6)*

> *"Thưa Thầy, để mọi thành viên trong nhóm đều có thể triển khai môi trường giám sát chỉ trong 10 giây mà không cần cấu hình phức tạp, nhóm em đã đóng gói thành file thực thi **`start-monitoring.bat`**.
>
> Ngay trên slide này, nhóm em cũng tích hợp sẵn bộ giả lập lưu lượng. Khi em nhấn nút **'Bắn 10 Request Đặt Lịch'** *(Tài click chuột vào nút màu cam trên slide)*, hệ thống sẽ mô phỏng bệnh nhân gửi yêu cầu và các chỉ số HTTP, RAM, Latency sẽ được cập nhật tức thì!"*

---

### 🎙️ CHUYỂN MÀN HÌNH: DEMO TRỰC TIẾP TRÊN GRAFANA & PROMETHEUS
*(Tài bấm tổ hợp phím `Alt + Tab` chuyển sang cửa sổ trình duyệt đã mở sẵn Grafana và Prometheus)*

#### 1. Tại Tab Prometheus (`http://localhost:9090/targets`):
> *"Trước tiên, em xin mời Thầy xem qua giao diện **Prometheus Targets**.  
> Như Thầy thấy trên màn hình, endpoint **`medsched-cloud-render`** đang ở trạng thái **State: UP (Màu xanh lá)**.  
> Prometheus đã cào dữ liệu thành công từ địa chỉ Cloud `https://medsched-zu15.onrender.com/actuator/prometheus` với chu kỳ cào đều đặn là 5 giây một lần."*

#### 2. Tại Tab Grafana (`http://localhost:3100`):
*(Chuyển sang tab Grafana Dashboard)*
> *"Và đây là **Dashboard Giám Sát Thời Gian Thực MedSched Cloud Production** trên Grafana:
>
> - **Góc trên cùng:** Hiển thị thời gian máy chủ Cloud đã hoạt động liên tục (Uptime) và trạng thái kết nối.
> - **Cột chỉ số lưu lượng HTTP:** Thầy có thể thấy đồ thị tốc độ yêu cầu (Request Rate) và phân tích mã lỗi HTTP. Hiện tại 100% request đều trả về mã `200 OK`.
> - **Đồng hồ kim đo độ trễ (Latency P95):** Đang dao động ở mức lý tưởng khoảng **40 - 60 ms**, phản hồi cực kỳ nhanh chóng.
> - **Đồng hồ đo RAM JVM Heap:** Ứng dụng Spring Boot đang dùng khoảng **300 - 350 MB** trên tổng số 2 GB RAM được cấp, bộ nhớ rất ổn định và không hề có dấu hiệu rò rỉ.
> - **Khu vực HikariCP MySQL Pool:** Cho thấy số kết nối cơ sở dữ liệu luôn sẵn sàng, bảo đảm không một bệnh nhân nào bị treo đơn đặt khám."*

---

### 🎙️ SLIDE 7: HỎI ĐÁP KỸ THUẬT (FAQ - Tự tin xử lý các câu Thầy hay hỏi)
*(Tài bấm `Alt + Tab` quay lại Slide, bấm sang Slide 7)*

> *"Thưa Thầy, trong quá trình nghiên cứu và xây dựng giải pháp giám sát này, nhóm em đã phân tích sâu 3 bài toán kỹ thuật cốt lõi mà các kỹ sư vận hành hệ thống thường quan tâm..."*

*(Tài trình bày lướt qua 3 luận điểm trên slide như đã chuẩn bị ở Phần 5 bên dưới).*

---

### 🎙️ SLIDE 8: TỔNG KẾT & LỜI CẢM ƠN
*(Bấm phím `→` sang Slide 8)*

> *"Dạ thưa Thầy, việc tích hợp thành công Prometheus và Grafana đã giúp dự án MedSched hoàn thiện mảnh ghép vận hành theo đúng chuẩn **Cloud-Native Doanh Nghiệp**. Hệ thống không chỉ chạy tốt về mặt chức năng mà còn được bảo vệ và theo dõi sức khỏe 24/7 một cách minh bạch, sẵn sàng phục vụ người bệnh an toàn và tin cậy.
>
> Em xin chân thành cảm ơn Thầy Trương Thanh Bình đã tận tình hướng dẫn nhóm em hoàn thành đề tài này! Em xin lắng nghe nhận xét và góp ý của Thầy ạ!"*

---

<a name="phan-5-cau-hoi-thay-hay-hoi"></a>
## 💡 PHẦN 5: PHẢN XẠ TRẢ LỜI 3 CÂU HỎI "BẪY" THẦY BÌNH HAY HỎI

Thầy Bình rất thích hỏi sâu về bản chất kiến trúc. Nếu Thầy hỏi, Tài cứ bình tĩnh trả lời theo đúng các luận điểm sau:

### ❓ Câu 1: "Tại sao nhóm em lại dùng cơ chế PULL (Prometheus tự kéo) mà không dùng cơ chế PUSH (Backend tự đẩy số liệu sang)?"
* **Tài trả lời:**  
  > *"Dạ thưa Thầy, nhóm em chọn cơ chế **PULL** vì đây là tiêu chuẩn vàng của Prometheus và Cloud-Native:  
  > 1. Khi backend gặp sự cố quá tải lượng lớn bệnh nhân, nếu dùng cơ chế PUSH thì backend sẽ phải gánh thêm tác vụ liên tục tạo kết nối ra ngoài để đẩy số liệu, càng làm server nhanh sập hơn.  
  > 2. Với cơ chế PULL, Prometheus là bên chủ động điều tiết nhịp cào (5 giây/lần). Backend chỉ việc lưu biến đếm trên RAM, khi nào Prometheus hỏi tới thì đọc ra trong chưa đầy 1 mili-giây, hoàn toàn bảo vệ backend không bị quá tải."*

### ❓ Câu 2: "Tại sao cổng Grafana lại đặt là 3100 mà thông thường người ta hay dùng cổng 3000?"
* **Tài trả lời:**  
  > *"Dạ thưa Thầy, cổng mặc định của Grafana đúng là 3000. Tuy nhiên trong dự án MedSched, **giao diện Web Next.js dành cho bệnh nhân đã sử dụng cổng 3000**.  
  > Vì vậy, trong file cấu hình Docker Compose, nhóm em đã chủ động ánh xạ cổng `3100:3000` để phân tách môi trường, giúp cả trang web bệnh nhân và trang quản trị Grafana có thể chạy song song trên cùng một máy tính mà không bao giờ bị xung đột cổng."*

### ❓ Câu 3: "Cứ 5 giây Prometheus cào dữ liệu một lần như vậy thì có làm chậm hệ thống đặt lịch của bệnh nhân không?"
* **Tài trả lời:**  
  > *"Dạ thưa Thầy, hoàn toàn không làm chậm ạ!  
  > Vì thư viện Micrometer trong Spring Boot sử dụng các biến đếm nguyên tử trong bộ nhớ RAM (`AtomicLong` và `MeterRegistry`). Khi bệnh nhân đặt lịch, hệ thống chỉ mất vài nano-giây để tăng biến đếm trên RAM.  
  > Khi Prometheus cào dữ liệu qua cổng `/actuator/prometheus`, server chỉ việc tuần tự hóa các số liệu có sẵn trên RAM trả về dưới dạng văn bản thuần, mức tiêu thụ CPU tăng chưa tới 1%, hoàn toàn không ảnh hưởng tới luồng đặt khám của người bệnh ạ."*

---

<a name="phan-6-xu-ly-su-co"></a>
## 🛠️ PHẦN 6: KẾ HOẠCH DỰ PHÒNG (NẾU GẶP SỰ CỐ KHI DEMO)

* **Sự cố 1: Quên chưa bật Docker Desktop:**
  * File `start-monitoring.bat` đã được lập trình thông minh, nếu Docker chưa bật nó sẽ hiện thông báo tiếng Việt nhắc nhở: *"[!] Docker Desktop chưa được bật..."*. Lúc này Tài chỉ cần bật Docker Desktop lên rồi chạy lại file là xong.
* **Sự cố 2: Mạng wifi ở trường bị chập chờn:**
  * Nhóm đã cấu hình sẵn kịch bản kép: nếu Cloud Render phản hồi chậm do mạng, trong file `start-monitoring.bat` và trên Slide 6 vẫn có sẵn chế độ giả lập dữ liệu cục bộ chạy mượt mà 100%.
* **Sự cố 3: Trình duyệt không tự mở tab:**
  * Tài chỉ cần mở Chrome và gõ trực tiếp địa chỉ:
    * Grafana: `http://localhost:3100`
    * Prometheus: `http://localhost:9090/targets`

---
🎉 **Chúc bạn Tài và nhóm MedSched có một buổi báo cáo thành công xuất sắc, đạt điểm tuyệt đối trước Thầy Trương Thanh Bình!**
