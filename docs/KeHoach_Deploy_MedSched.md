# 📋 KẾ HOẠCH TRIỂN KHAI DỰ ÁN MEDSCHED LÊN SERVER (Bản chỉnh theo code thực tế)

**Mục tiêu:** Đưa dự án MedSched (Backend Spring Boot 3 + Frontend Next.js 15 + MySQL) lên môi trường thực tế với chi phí **0đ**, để thầy có thể kiểm chứng qua link mà không cần mang máy tính.

> Bản này đã đối chiếu với repo thật của nhóm (Gradle multi-module, `application.yml`, `CorsConfig.java`, `JwtService.java`, `frontend/src/lib/api.ts`...) — sửa lại những chỗ không khớp trong bản kế hoạch gốc (Maven → Gradle, Vite → Next.js, v.v.) để làm theo được ngay.

---

## 🎯 PHẦN 1: TỔNG QUAN KẾ HOẠCH

### 1.1. Combo dịch vụ

| Thành phần | Dịch vụ | Vai trò | Chi phí |
|---|---|---|---|
| **Frontend** | Vercel | Chứa Next.js 15 | 0đ |
| **Backend** | Render | Chạy Spring Boot 3 (`medsched-app.jar`) | 0đ |
| **Database** | Aiven for MySQL | Lưu dữ liệu (thay XAMPP) | 0đ |
| **Mã nguồn** | GitHub | Nguồn chân lý, trigger deploy | 0đ |
| **Giữ backend thức** | UptimeRobot | Ping backend mỗi 5 phút | 0đ |

### 1.2. Sơ đồ kiến trúc

```
┌──────────────┐
│   THẦY       │  Mở link → xem dự án
└──────┬───────┘
       ▼
┌──────────────────┐
│  VERCEL          │  https://medsched.vercel.app
│  (Next.js 15)    │  Giao diện người dùng
└────────┬─────────┘
         │ NEXT_PUBLIC_API_URL (fetch)
         ▼
┌──────────────────┐
│  RENDER          │  https://medsched-api.onrender.com
│  (Spring Boot 3) │  512MB RAM / 0.1 CPU (free)
└────────┬─────────┘
         │ JDBC + SSL
         ▼
┌──────────────────┐
│  AIVEN           │  mysql-xxx.aivencloud.com:xxxxx
│  (MySQL Cloud)   │  1GB RAM / 1GB disk (free vĩnh viễn)
└──────────────────┘

        ▲
        │ git push
┌──────────────────┐
│  MÁY LOCAL       │  Code + test với XAMPP (profile mysql-xampp)
└──────────────────┘
```

---

## 🚦 GIAI ĐOẠN 0: ĐIỀU KIỆN TIÊN QUYẾT (trước khi bắt đầu)

- [ ] Merge 4 branch feature (`101-kiet`, `102-tai`, `103-hieu`, `104-trang`) về `develop`, giải quyết hết conflict.
  ⚠️ **Không deploy khi code còn rời rạc** — branch `104-trang-booking-ui` đã đổi cấu trúc frontend sang `modules/`, Vercel chỉ build 1 branch nên phải merge xong trước.
- [ ] Chốt 1 người phụ trách deploy, tránh nhiều người cùng sửa biến môi trường/repo cùng lúc.
- [ ] Đảm bảo `develop` build local thành công (`./gradlew :app:bootJar`, `pnpm build` ở frontend) trước khi động vào cloud.

---

## 📅 GIAI ĐOẠN 1: CHUẨN BỊ MÃ NGUỒN CHO PRODUCTION

**Vấn đề hiện tại:** repo chỉ có 1 profile `mysql-xampp`, cổng hardcode `8080`, CORS hardcode `localhost` trong `CorsConfig.java`, JWT secret có giá trị mặc định ngay trong code.

### 1.1. Thêm profile `prod` vào `app/src/main/resources/application.yml`

```yaml
---
spring:
  config:
    activate:
      on-profile: prod
server:
  port: ${PORT:8080}          # Render tự set biến PORT
spring:
  datasource:
    url: jdbc:mysql://${DB_HOST}:${DB_PORT}/${DB_NAME}?useSSL=true&requireSSL=true&serverTimezone=Asia/Ho_Chi_Minh
    username: ${DB_USER}
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate      # KHÔNG dùng update ở prod sau khi đã import schema xong
medsched:
  cors:
    allowed-origins: ${CORS_ORIGINS}
```

> Flyway hiện đang **tắt** (`spring.flyway.enabled: false`), chưa có file migration nào — nhóm đang dựa vào `medsched_db.sql` import tay + Hibernate `update` ở local. Ở prod: import `medsched_db.sql` vào Aiven trước, rồi set `ddl-auto: validate` để tránh Hibernate tự ý sửa schema đã import. Nếu nhóm còn đang thêm bảng mới, tạm giữ `update`, nhưng chuyển sang `validate` trước ngày demo.

### 1.2. Sửa `CorsConfig.java`

Hiện đang hardcode `"http://localhost:3000", "http://localhost:3001"`, không đọc property `medsched.cors.allowed-origins` dù đã khai báo trong yml. Đổi thành đọc từ `@Value` và split theo dấu phẩy:

```java
@Value("${medsched.cors.allowed-origins}")
private String allowedOrigins;
// ... registry.addMapping("/api/**").allowedOrigins(allowedOrigins.split(","))
```

### 1.3. JWT secret

`JwtService.java` đã validate ≥32 ký tự — an toàn. Nhưng **bắt buộc** đặt `JWT_SECRET` mới trên Render, không dùng giá trị mặc định hardcode sẵn trong `application.yml`.

### 1.4. `.gitignore`

Thêm: `build/`, `.gradle/`, `node_modules/`, `.next/`, `.env*`.

> Frontend **không cần sửa gì** — `frontend/src/lib/api.ts` đã sẵn `process.env.NEXT_PUBLIC_API_URL`, đúng chuẩn Next.js.

### 1.5. Push code

```bash
git add .
git commit -m "Chuẩn bị cấu hình production"
git push origin develop
```

---

## 📅 GIAI ĐOẠN 2: SETUP DATABASE TRÊN AIVEN

- [ ] Đăng ký [Aiven](https://aiven.io) — gói **Free** vẫn còn vĩnh viễn (1 CPU / 1GB RAM / 1GB disk, không cần thẻ), chọn region **Singapore**.
- [ ] Đợi 2-5 phút khởi tạo, lấy **Host, Port, User, Password, Database name** + tải **CA Certificate**.
- [ ] Export `Source_code/database/medsched_db.sql` từ phpMyAdmin (XAMPP).
- [ ] Import vào Aiven qua DBeaver/MySQL Workbench.
- [ ] Kiểm tra kỹ: file gốc là MariaDB (XAMPP), Aiven chạy MySQL 8 — chú ý collation/charset `utf8mb4` vì DB có nhiều cột tiếng Việt.
- [ ] Query thử vài bảng xác nhận dữ liệu lên đủ.

**⚠️ Lỗi thường gặp:** encoding UTF-8, khác bản MariaDB/MySQL, câu lệnh `CREATE DATABASE` cần xóa trước khi import.

---

## 📅 GIAI ĐOẠN 3: DEPLOY BACKEND LÊN RENDER

- [ ] Đăng ký [Render](https://render.com) bằng GitHub, tạo **New Web Service**, chọn repo + branch `develop` (hoặc `main` sau khi merge).
- [ ] Cấu hình:

```
Runtime: Java 21   (dự án dùng Gradle toolchain 21 — kiểm tra Render hỗ trợ đúng bản)
Build Command: ./gradlew :app:bootJar -x test
Start Command: java -jar app/build/libs/medsched-app.jar --spring.profiles.active=prod
Instance Type: Free
```

> Không dùng `./mvnw` / `target/*.jar` — dự án là **Gradle multi-module** (`core` + `app`), jar được đặt tên cố định `medsched-app.jar` trong `app/build.gradle`, nằm ở `app/build/libs/`.

- [ ] Environment Variables:

```
DB_HOST=mysql-xxx.aivencloud.com
DB_PORT=12345
DB_NAME=medsched_db
DB_USER=avnadmin
DB_PASSWORD=your_password
JWT_SECRET=<chuỗi ngẫu nhiên ≥32 ký tự, KHÁC giá trị mặc định trong code>
CORS_ORIGINS=https://medsched.vercel.app
JAVA_TOOL_OPTIONS=-XX:MaxRAMPercentage=65
```

- [ ] Nhấn **Create Web Service**, theo dõi log build (thường 3-5 phút).
- [ ] Test: `https://medsched-api.onrender.com/api/v1/medical-centers` (endpoint không cần đăng nhập).

**⚠️ Rủi ro riêng của backend này:**
- Render free chỉ **512MB RAM / 0.1 CPU** — Spring Boot 3 + Hibernate + Spring AI dependency (`spring-ai-openai-spring-boot-starter`) khá nặng lúc khởi động. Hiện dự án dùng `RuleBasedAiTriageAdapter` (không gọi OpenAI thật) nên đỡ tốn RAM hơn, nhưng **vẫn phải test kỹ thời gian boot thật** trước khi tin tưởng cho demo.
- Build fail do Java version: kiểm tra Render hỗ trợ Java 21.
- SSL lỗi khi kết nối Aiven: thêm `?useSSL=true&requireSSL=true` vào URL (đã có trong config Giai đoạn 1.1).

---

## 📅 GIAI ĐOẠN 4: DEPLOY FRONTEND LÊN VERCEL

- [ ] Đăng ký [Vercel](https://vercel.com) bằng GitHub, **New Project**, import repo.
- [ ] Vercel **tự nhận diện Next.js** — không cần chỉnh Build Command/Output Directory.
- [ ] Environment Variables:

```
NEXT_PUBLIC_API_URL=https://medsched-api.onrender.com/api/v1
```

> Chú ý có `/api/v1` ở cuối — khớp với giá trị mặc định trong `frontend/src/lib/api.ts`.

- [ ] Nhấn **Deploy**, đợi 1-2 phút, Vercel cấp URL `https://medsched.vercel.app`.
- [ ] Mở URL kiểm tra giao diện.

---

## 📅 GIAI ĐOẠN 5: TEST END-TO-END

- [ ] Vào `https://medsched.vercel.app`, mở DevTools → Network, kiểm tra không có lỗi CORS.
- [ ] Test đủ 4 role bằng tài khoản demo có sẵn trong `medsched_db.sql`:

| Tài khoản | Mật khẩu | Vai trò |
|---|---|---|
| `benhnhan.demo@gmail.com` | `Medsched@123` | Customer |
| `dr.minhanh@medsched.vn` | `Medsched@123` | Bác sĩ |
| `letan.q1@medsched.vn` | `Medsched@123` | Lễ tân |
| `admin@medsched.vn` | `Medsched@123` | Admin |

- [ ] Test các luồng chính: đăng nhập, đặt lịch, check-in QR, admin quản lý user, khóa/mở khóa tài khoản.

---

## 📅 GIAI ĐOẠN 6: TỐI ƯU VÀ BẢO MẬT

- [ ] **UptimeRobot**: tạo HTTP(s) Monitor cho `https://medsched-api.onrender.com`, interval 5 phút.
  ⚠️ Đây **không phải cách Render chính thức hỗ trợ** để chống sleep — free service vẫn có thể ngủ dù có ping. Vẫn phải "đánh thức" thủ công trước buổi demo (xem Giai đoạn 7).
- [ ] **Backup database**: export Aiven về máy, lưu file `.sql`.
- [ ] **Bảo mật**: không hard-code mật khẩu, `CORS_ORIGINS` chỉ chứa domain cụ thể (không dùng `*`), SSL bật cho DB.
- [ ] **Tối ưu JVM**: xác nhận `JAVA_TOOL_OPTIONS=-XX:MaxRAMPercentage=65` đã set.
- [ ] Chuẩn bị dữ liệu demo đẹp, không rác/lỗi.

---

## 📅 GIAI ĐOẠN 7: CHUẨN BỊ DEMO VÀ BẢO VỆ

- [ ] Viết tài liệu ngắn: link frontend/backend/GitHub, sơ đồ kiến trúc, công nghệ dùng.
- [ ] Kịch bản demo: mở link → đăng nhập demo → 3-5 chức năng chính → (tùy) mở GitHub cho thầy xem code.
- [ ] **Test cold-start thật** trước 1 ngày: để backend im lặng >15 phút rồi bấm link, đo thời gian phản hồi thực tế — từ đó biết cần "đánh thức" trước bao lâu.
- [ ] Đánh thức Render 5-10 phút trước khi thầy xem.
- [ ] Chuẩn bị phương án dự phòng (ảnh chụp màn hình nếu mạng lỗi).
- [ ] Gửi thầy link trước buổi bảo vệ.

---

## 🔄 QUY TRÌNH UPDATE HÀNG NGÀY (sau khi deploy xong)

```
1. Code local + test với XAMPP (profile mysql-xampp)
   ↓
2. Đổi schema? → chạy SQL thủ công trên Aiven qua DBeaver
   ↓
3. git add . && git commit -m "Mô tả" && git push origin develop
   ↓
4. Vercel/Render tự động deploy (1-5 phút)
   ↓
5. Test lại trên link production
```

**Lưu ý:** Database không tự sync — phải thao tác thủ công. Nếu push lỗi → rollback trên Vercel/Render trong 10 giây. Không push khi thầy đang xem demo.

---

## ⚠️ RỦI RO VÀ CÁCH XỬ LÝ

| Rủi ro | Xác suất | Cách xử lý |
|---|---|---|
| Backend Render 512MB RAM không đủ cho Spring Boot | Trung bình | Test kỹ thời gian boot, giảm `MaxRAMPercentage`, cân nhắc tắt bớt dependency không dùng |
| Backend Render bị ngủ | Cao | UptimeRobot + đánh thức thủ công trước demo |
| CORS error | Trung bình | Đã sửa `CorsConfig.java` đọc từ `CORS_ORIGINS`, kiểm tra đúng domain Vercel |
| Database import lỗi (MariaDB → MySQL 8) | Trung bình | Kiểm tra encoding `utf8mb4`, xóa `CREATE DATABASE` cũ trước import |
| `ddl-auto` phá schema đã import | Trung bình | Set `validate` sau khi import xong, không để `update` chạy ở prod lâu dài |
| Build fail trên Render (nhầm Maven/Gradle) | Trung bình | Dùng đúng lệnh Gradle ở Giai đoạn 3 |
| Hết quota giờ chạy free/tháng | Thấp | Theo dõi dashboard Render |
| Thầy mở link lúc đang deploy | Thấp | Không push code trong giờ demo |

---

## 💰 CHI PHÍ TỔNG THỂ

| Dịch vụ | Gói | Chi phí |
|---|---|---|
| GitHub | Free | 0đ |
| Vercel | Hobby | 0đ |
| Render | Free | 0đ |
| Aiven | Free | 0đ |
| UptimeRobot | Free | 0đ |
| **TỔNG** | | **0đ** |

---

## 💡 LỜI KHUYÊN CUỐI

1. Merge code ổn định (Giai đoạn 0) **trước khi** đụng vào cloud — đừng vừa deploy vừa đổi API.
2. Test kỹ ở local (profile `mysql-xampp`) trước khi push production (profile `prod`).
3. Backup database trước mọi thay đổi lớn.
4. Test cold-start thật, đừng chỉ tin vào UptimeRobot.
5. Đừng ngại rollback nếu code lỗi.
