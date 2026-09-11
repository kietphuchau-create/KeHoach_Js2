# 05. Ý Tưởng Database Của Tài — Persistence Layer Prototype

> Đây là **bản đề xuất cá nhân** (không thay cho công việc của cả nhóm), do **Lê Thành Tài** — thành viên phụ trách CSDL theo phân công trong [`De_Xuat_Du_An_MedSched_Nhom.md`](../De_Xuat_Du_An_MedSched_Nhom.md) — chuẩn bị để minh họa cách 12 bảng trong [`04_Database_Design`](../04_Database_Design/) trở thành code thật (JPA Entity + Flyway migration), dựa trên việc đào sâu 2 repo tham khảo nhóm cung cấp.

## 1. Vì sao có thư mục này

Nhóm đã cho tôi xem 2 repo mẫu để tham khảo kiến trúc:
* `spring-ai-demo` (EvShop) — Spring Boot Hexagonal Architecture (`core` domain thuần + `app` adapter), Flyway versioned migration, Docker Compose Postgres.
* `next-demo` — Next.js storefront gọi API của EvShop.

Tôi đã đọc trực tiếp source code thật trong `spring-ai-demo/core` và `spring-ai-demo/app` (không chỉ README) để lấy đúng quy ước: cách đặt tên gói, cách map Entity ↔️ cột DB, cách viết Repository với `@Modifying @Query` cho thao tác cần an toàn concurrency, cấu trúc Flyway `db/migration`, `application.yml`, `docker-compose.db.yml`. Thư mục này là **bản dịch 1-1 của 12 bảng MedSched sang đúng phong cách đó**, giới hạn đúng trong phạm vi công việc của Tài — **không đụng vào** phần của Hiếu (use case/controller/JWT), Tân (Spring AI) hay Trang (Frontend).

## 2. Phạm vi cố ý giới hạn (Scope Boundary)

Repo mẫu `spring-ai-demo` tách 2 tầng: `core` (domain model thuần `record`, use case, port interface) và `app/adapter/out/persistence` (JPA Entity + Spring Data Repository + RepositoryAdapter nối 2 bên). Thư mục này **chỉ làm phần tương đương `app/adapter/out/persistence`** — tức là:

| Có trong prototype này | Không có (thuộc phần việc người khác) |
|:---|:---|
| 12 JPA `@Entity` khớp 100% cột trong `medsched_schema.sql` | Domain model thuần (`record Appointment(...)`), Use Case, Port interface — của **Hiếu** |
| 12 `JpaRepository` (kèm vài `@Modifying @Query` / derived query có ý nghĩa nghiệp vụ) | REST Controller, Spring Security/JWT — của **Hiếu** |
| Flyway migration (Postgres **và** MySQL/XAMPP) | Spring AI ChatClient/Triage/Sentiment — của **Tân** |
| `docker-compose.yml` cho Postgres, `application.yml` 2 profile | Giao diện Next.js — của **Trang** |

Khi cả nhóm bắt đầu code app thật, Hiếu chỉ cần viết thêm `RepositoryAdapter` (giống `ProductRepositoryAdapter` trong EvShop) để map giữa domain model của use case và các Entity ở đây — không cần viết lại tầng persistence từ đầu.

## 3. Những quyết định kỹ thuật đáng chú ý

1. **`id` luôn do tầng ứng dụng sinh (`UUID.randomUUID().toString()`), không có `@GeneratedValue` và không có `DEFAULT` ở DB.** Copy đúng quy ước của `ProductEntity`/`UserEntity` trong EvShop — giữ tầng Entity đơn giản, không phụ thuộc cơ chế sinh khóa khác nhau giữa Postgres/MySQL.
2. **`id` kiểu `VARCHAR(36)`, không dùng kiểu `UUID` native của Postgres.** Bản chính thức `04_Database_Design/medsched_schema.sql` dùng kiểu `UUID` — ở đây đổi thành `VARCHAR(36)` để khớp thẳng với `private String id` trong Entity mà không cần viết `AttributeConverter`, giống hệt cách EvShop làm (Postgres nhưng cột id vẫn `VARCHAR(36)`).
3. **`TimeSlotEntity.version` dùng `@Version` thật của JPA** (Optimistic Locking tiêu chuẩn) — khi 2 request cùng load 1 slot rồi `save()`, request thứ hai nhận `OptimisticLockException` thay vì âm thầm ghi đè. Đây chính là cơ chế đã mô tả trong kịch bản **7.6** (race condition đặt trùng slot) ở `03_Luong_Chinh/Luong_Nghiep_Vu_Chinh.md`.
4. **`TimeSlotJpaRepository#compareAndSetStatus`** — thêm một đường tắt `UPDATE ... WHERE status = :expected` (mô phỏng đúng `ProductJpaRepository#decrementStock` trong EvShop) cho luồng đặt lịch tần suất cao, không cần load cả entity. Lưu ý quan trọng đã ghi trong Javadoc: `UPDATE` hàng loạt qua JPQL **không** tự tăng `@Version`, nên phải set thủ công `t.version = t.version + 1` trong câu query.
5. **Enum tiếng Anh viết hoa cho mọi cột trạng thái** (`UserRole`, `AppointmentStatus`, `SlotStatus`...) ánh xạ bằng `@Enumerated(EnumType.STRING)` — giống cách EvShop dùng `OrderStatus`/`Role` — thay vì lưu `String` tự do, để Hibernate tự validate giá trị hợp lệ ở tầng Java trước khi chạm DB.
6. **2 bộ Flyway migration song song** (`db/migration/postgresql` và `db/migration/mysql`), chọn qua Spring profile (`postgres` mặc định / `mysql-xampp`) — đúng tinh thần mục 5.5 của `Database_Design.md`: Postgres là phương án chính thức nộp báo cáo, MySQL/XAMPP là phương án phát triển cá nhân/offline.

## 4. Đã kiểm thử thật, không phải đoán cú pháp

Môi trường làm việc của tôi không đủ RAM để chạy Gradle/Spring Boot đầy đủ (JVM lỗi `Out of memory` ngay cả với `java -version`), nên **không** build được module Java này bằng `./gradlew build` tại đây. Thay vào đó, tôi đã kiểm thử phần rủi ro cao nhất — chính bản thân file SQL — bằng cách khác:

* Dựng tạm 1 instance **MariaDB 10.4.32** (đúng bản đóng gói trong `C:\xampp`, giảm `innodb-buffer-pool-size` xuống 8MB để chạy được trong môi trường giới hạn RAM) và chạy thẳng `db/migration/mysql/V1__init_schema.sql` + `V2__seed_data.sql` — **tạo đủ 12 bảng, insert seed thành công, không lỗi**.
* Diff cấu trúc (bỏ comment) giữa 2 file Flyway này với `04_Database_Design/medsched_schema.sql` và `medsched_schema_mysql_xampp.sql` (2 file đã được kiểm thử ở nhánh `feature/xampp-mysql-db-and-edge-cases` trước đó) — xác nhận **không lệch một cột/constraint nào** ngoài thay đổi cố ý (`UUID→VARCHAR(36)`, bỏ `DEFAULT`).
* Docker daemon không chạy sẵn trong môi trường này nên **chưa kiểm thử được bản Postgres bằng engine thật** — bạn nào chạy `docker compose up -d` trước khi `./gradlew bootRun --args='--spring.profiles.active=postgres'` nên báo lại nếu Flyway báo lỗi (khả năng rất thấp vì cú pháp giống hệt bản đã test).
* Các file `.java` (Entity, Repository, enum) được viết tay theo đúng convention đã đọc trực tiếp từ `spring-ai-demo/app/src/main/java/com/eshop/app/adapter/out/persistence/**` — **chưa compile được** trong sandbox này do JVM không đủ bộ nhớ khởi động. Hãy chạy `./gradlew compileJava` trên máy có đủ RAM trước khi tin tưởng tuyệt đối.

## 5. Cách chạy thử

```bash
# Phương án Postgres (mặc định, cần Docker)
docker compose up -d
./gradlew bootRun

# Phương án MySQL/XAMPP (không cần Docker, chỉ cần bật MySQL trong XAMPP Control Panel)
./gradlew bootRun --args='--spring.profiles.active=mysql-xampp'
```

Ứng dụng không có tầng web (chỉ `spring-boot-starter-data-jpa`), nên khi chạy thành công nghĩa là: Flyway migrate xong + Hibernate `ddl-auto=validate` xác nhận **12 Entity khớp 100% với schema thật** — một smoke test hữu ích trước khi Hiếu bắt đầu build use case lên trên.

## 6. Cấu trúc thư mục

```
05_Y_Tuong_Database_Tai/
├── build.gradle, settings.gradle, gradlew(.bat)   # Gradle wrapper 9.5.1, copy từ spring-ai-demo
├── docker-compose.yml                              # Postgres, healthcheck (chỉ profile "postgres")
└── src/main/
    ├── java/com/medsched/persistence/
    │   ├── MedSchedPersistenceApplication.java
    │   ├── entity/            # 12 @Entity, khớp 12 bảng
    │   ├── enums/              # 10 enum trạng thái, dùng chung với @Enumerated(STRING)
    │   └── repository/        # 12 JpaRepository
    └── resources/
        ├── application.yml    # profile "postgres" (mặc định) + "mysql-xampp"
        └── db/migration/
            ├── postgresql/V1__init_schema.sql, V2__seed_data.sql
            └── mysql/V1__init_schema.sql, V2__seed_data.sql
```
