# 05. Ý Tưởng Database Của Tài — Persistence Layer Prototype

> Đây là **bản đề xuất cá nhân** (không thay cho công việc của cả nhóm), do **Lê Thành Tài** — thành viên phụ trách CSDL theo phân công trong [`De_Xuat_Du_An_MedSched_Nhom.md`](../De_Xuat_Du_An_MedSched_Nhom.md) — chuẩn bị để minh họa cách 16 bảng trong [`04_Database_Design`](../04_Database_Design/) trở thành code thật (JPA Entity + Flyway migration), dựa trên việc đào sâu 2 repo tham khảo nhóm cung cấp.

## 1. Vì sao có thư mục này

Nhóm đã cho tôi xem 2 repo mẫu để tham khảo kiến trúc:
* `spring-ai-demo` (EvShop) — Spring Boot Hexagonal Architecture (`core` domain thuần + `app` adapter), Flyway versioned migration, Docker Compose Postgres.
* `next-demo` — Next.js storefront gọi API của EvShop.

Tôi đã đọc trực tiếp source code thật trong `spring-ai-demo/core` và `spring-ai-demo/app` (không chỉ README) để lấy đúng quy ước: cách đặt tên gói, cách map Entity ↔️ cột DB, cách viết Repository với `@Modifying @Query` cho thao tác cần an toàn concurrency, cấu trúc Flyway `db/migration`, `application.yml`, `docker-compose.db.yml`. Thư mục này là **bản dịch 1-1 của 16 bảng MedSched sang đúng phong cách đó**, giới hạn đúng trong phạm vi công việc của Tài — **không đụng vào** phần của Hiếu (use case/controller/JWT), Tân (Spring AI) hay Trang (Frontend).

## 2. Phạm vi cố ý giới hạn (Scope Boundary)

Repo mẫu `spring-ai-demo` tách 2 tầng: `core` (domain model thuần `record`, use case, port interface) và `app/adapter/out/persistence` (JPA Entity + Spring Data Repository + RepositoryAdapter nối 2 bên). Thư mục này **chỉ làm phần tương đương `app/adapter/out/persistence`** — tức là:

| Có trong prototype này | Không có (thuộc phần việc người khác) |
|:---|:---|
| 16 JPA `@Entity` khớp 100% cột trong `medsched_schema.sql` | Domain model thuần (`record Appointment(...)`), Use Case, Port interface — của **Hiếu** |
| 16 `JpaRepository` (kèm vài `@Modifying @Query` / derived query có ý nghĩa nghiệp vụ) | REST Controller, Spring Security/JWT — của **Hiếu** |
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

### 3.1. Ba sửa đổi của bản 3.0 (theo góp ý phản biện) ảnh hưởng gì tới tầng code

| Sửa đổi ở CSDL | Thay đổi tương ứng trong module này |
|:---|:---|
| `users` bỏ `medical_center_id` + `role` | `UserEntity` chỉ còn danh tính thuần (email, mật khẩu, tên, điện thoại, trạng thái). Thêm `UserMedicalCenterRoleEntity` + `UserMedicalCenterRoleJpaRepository#findByUserIdAndActiveTrue` để Spring Security nạp quyền theo từng chi nhánh khi đăng nhập. |
| `UserRole` bỏ `ROLE_PATIENT` | Enum chỉ còn `ROLE_DOCTOR`, `ROLE_STAFF`, `ROLE_ADMIN` — vì "bệnh nhân" là quyền mặc định của mọi tài khoản, không cần cấp. |
| `doctors` đổi sang `UNIQUE(user_id, specialty_id)` | `DoctorEntity` khai báo `@UniqueConstraint`; `DoctorJpaRepository#findByUserId` đổi từ `Optional` sang `List` (1 người có thể là bác sĩ ở nhiều khoa/chi nhánh), thêm `findByUserIdAndSpecialtyId`. |
| Thêm bảng `payments` | `PaymentEntity` + `PaymentJpaRepository`, có `findByTransactionRef` (bảo đảm idempotent khi webhook cổng thanh toán gọi lặp) và `sumSucceededNetAmount` (suy ra tình trạng thanh toán thay cho cột `payment_status` đã bỏ khỏi `AppointmentEntity`). |
| Thêm `medicines` + `prescription_items` | `MedicineEntity`, `PrescriptionItemEntity` và 2 repository; `MedicalRecordEntity` bỏ trường `prescription`. `PrescriptionItemJpaRepository#countMostPrescribedByCenter` là ví dụ truy vấn chỉ làm được sau khi tách bảng. |
| `appointments` thêm `medical_center_id` | `AppointmentEntity` thêm trường tương ứng (nơi duy nhất cho biết ca khám diễn ra ở chi nhánh nào, vì `users` đã toàn cục). |

## 4. Đã kiểm thử thật, không phải đoán cú pháp

Môi trường làm việc của tôi **không chạy được Gradle** (daemon JVM crash `insufficient memory ... Native memory allocation (malloc) failed`, kể cả sau khi hạ xuống `-Xmx384m`), nên **không** build được bằng `./gradlew build` tại đây. Bù lại, tôi đã kiểm thử từng phần bằng công cụ khác:

**a) File SQL — chạy thật trên cả 2 hệ quản trị:**
* **MariaDB 10.4.32** (đúng bản trong `C:\xampp`, dựng instance tạm port 3307, hạ `innodb-buffer-pool-size` còn 8MB): chạy `db/migration/mysql/V1 + V2` ➔ **16 bảng, 25 FK, 16 CHECK, 11 UNIQUE, seed thành công, không lỗi**.
* **PostgreSQL 18.6** (dựng cluster tạm port 5433, tách biệt hoàn toàn instance có sẵn của máy): chạy `db/migration/postgresql/V1 + V2` với `ON_ERROR_STOP=1` ➔ **không lỗi, số ràng buộc khớp y hệt bản MySQL**.
* **7/7 phép thử dữ liệu sai đều bị DB từ chối đúng thiết kế** (cấp `ROLE_PATIENT`, trùng quyền, tiền âm, hoàn quá số đã thu, webhook trùng `transaction_ref`, số lượng thuốc = 0, xóa ca khám đã có thanh toán) — bảng chi tiết ở mục 5.2 của [`Database_Design.md`](../04_Database_Design/Database_Design.md).
* Truy vấn **chứng minh sửa đổi [1]**: cùng 1 tài khoản bệnh nhân có ca khám ở cả `MED_Q1` và `MED_Q7`, dùng chung hồ sơ bệnh án.

**b) Code Java — compile sạch bằng `javac`:**
* Máy chỉ có JDK 17 (module vẫn giữ toolchain 21 cho môi trường thật). Compile bằng `javac 17` với classpath lấy từ Gradle cache ➔ **44/44 file `.java` compile không lỗi**.

**c) Đối chiếu Entity ↔ schema thật (thay cho `ddl-auto=validate` chưa chạy được):**
* Script đọc từng `@Table`/`@Column` trong 16 entity rồi so với `information_schema` của database thật ➔ **185/185 cột đều tồn tại trong DB và trùng khớp ràng buộc `NOT NULL`**. Đây đúng là việc Hibernate `validate` làm lúc khởi động.
* So `information_schema` giữa bản Flyway MySQL và bản standalone `medsched_schema_mysql_xampp.sql` ➔ **185/185 cột + 68/68 ràng buộc khớp**; khác biệt duy nhất là 16 cột `id` có thêm `DEFAULT (UUID())` đúng như chủ ý đã ghi trong header 2 file.

**d) Còn lại cần người có máy đủ RAM xác nhận:**
* `./gradlew build` và `./gradlew bootRun` (Flyway migrate + Hibernate validate trong tiến trình Spring Boot thật). Theo (b) và (c) thì khả năng lỗi rất thấp, nhưng **vẫn nên chạy** trước khi Hiếu build use case lên trên.

## 5. Cách chạy thử

```bash
# Phương án Postgres (mặc định, cần Docker)
docker compose up -d
./gradlew bootRun

# Phương án MySQL/XAMPP (không cần Docker, chỉ cần bật MySQL trong XAMPP Control Panel)
./gradlew bootRun --args='--spring.profiles.active=mysql-xampp'
```

Ứng dụng không có tầng web (chỉ `spring-boot-starter-data-jpa`), nên khi chạy thành công nghĩa là: Flyway migrate xong + Hibernate `ddl-auto=validate` xác nhận **16 Entity khớp 100% với schema thật** — một smoke test hữu ích trước khi Hiếu bắt đầu build use case lên trên.

## 6. Cấu trúc thư mục

```
05_Y_Tuong_Database_Tai/
├── build.gradle, settings.gradle, gradlew(.bat)   # Gradle wrapper 9.5.1, copy từ spring-ai-demo
├── docker-compose.yml                              # Postgres, healthcheck (chỉ profile "postgres")
└── src/main/
    ├── java/com/medsched/persistence/
    │   ├── MedSchedPersistenceApplication.java
    │   ├── entity/            # 16 @Entity, khớp 16 bảng
    │   ├── enums/             # 11 enum trạng thái, dùng chung với @Enumerated(STRING)
    │   └── repository/        # 16 JpaRepository
    └── resources/
        ├── application.yml    # profile "postgres" (mặc định) + "mysql-xampp"
        └── db/migration/
            ├── postgresql/V1__init_schema.sql, V2__seed_data.sql
            └── mysql/V1__init_schema.sql, V2__seed_data.sql
```
