# 05. Backend MedSched — Database + Khung Sườn Task 1 (chạy bằng XAMPP)

> **Nhánh này = nhánh database + khung sườn Task 1.**
> - Tầng dữ liệu: 17 bảng trong [`04_Database_Design`](../04_Database_Design/) hiện thực bằng JPA Entity + Flyway.
> - **Khung sườn Task 1**: REST API xác thực & quản lý người dùng cho cả 4 vai trò — xem hướng dẫn đầy đủ trong [**`TASK1_KHUNG_SUON.md`**](./TASK1_KHUNG_SUON.md) (cách chạy, danh sách API, code mẫu để thêm tính năng, quy ước chung, phân công gợi ý).
>
> Chạy trên **MySQL/MariaDB của XAMPP**, không dùng PostgreSQL, không cần Docker.

## 1. Chạy trong 3 bước

```bash
# 1. Mở XAMPP Control Panel -> bấm Start ở dòng MySQL
# 2. Chạy ứng dụng:
./gradlew bootRun

# 3. Kiểm thử toàn bộ API Task 1 (terminal thứ 2):
bash test-task1.sh
```

Tài khoản mẫu (mật khẩu đều là `Medsched@123`): `benhnhan.demo@gmail.com` (khách hàng),
`dr.minhanh@medsched.vn` (bác sĩ), `letan.q1@medsched.vn` (lễ tân), `admin@medsched.vn` (quản trị).

Flyway tự tạo database `medsched_db` với 17 bảng + dữ liệu mẫu ngay lần chạy đầu.
Chạy xong không lỗi nghĩa là **Hibernate đã đối chiếu 17 Entity khớp 100% với
schema thật** (`ddl-auto=validate`) — một phép kiểm tra rất hữu ích trước khi
nhóm code tính năng lên trên.

Muốn xem/sửa bảng bằng giao diện: `http://localhost/phpmyadmin` → chọn `medsched_db`.
Muốn nạp tay không qua Gradle: Import file
[`04_Database_Design/medsched_schema_mysql_xampp.sql`](../04_Database_Design/medsched_schema_mysql_xampp.sql)
trong phpMyAdmin (file tự tạo database).

> Nếu MySQL của XAMPP chạy cổng khác 3306 hoặc root có mật khẩu: đặt biến môi
> trường `DB_URL`, `DB_USER`, `DB_PASSWORD`.

## 2. Cấu trúc

```
05_Y_Tuong_Database_Tai/
├── build.gradle, settings.gradle, gradlew(.bat)
└── src/main/
    ├── java/com/medsched/
    │   ├── MedSchedApplication.java
    │   ├── security/        # JWT, phân quyền theo chi nhánh  (dùng chung - đừng sửa)
    │   ├── common/          # khuôn JSON lỗi + xử lý lỗi chung (dùng chung - đừng sửa)
    │   ├── auth/            # Task 1: register / login / refresh
    │   ├── account/         # Task 1: /me, đổi mật khẩu, cập nhật hồ sơ
    │   ├── admin/           # Task 1: quản lý user + CRUD danh mục
    │   └── persistence/
    │       ├── entity/      # 17 @Entity, khớp 17 bảng
    │       ├── enums/       # 12 enum trạng thái (@Enumerated(STRING))
    │       └── repository/  # 17 JpaRepository
    └── resources/
        ├── application.yml           # trỏ thẳng vào XAMPP
        └── db/migration/mysql/
            ├── V1__init_schema.sql   # 17 bảng
            └── V2__seed_data.sql     # dữ liệu mẫu
```

## 3. Quy ước kỹ thuật

1. **`id` do tầng Java sinh** (`UUID.randomUUID().toString()`), không dùng `@GeneratedValue`, không dùng `DEFAULT` ở DB — để tầng Entity đơn giản và không phụ thuộc cơ chế sinh khóa của DBMS.
2. **`id` kiểu `VARCHAR(36)`** khớp thẳng `private String id` trong Entity, không cần `AttributeConverter`.
3. **`TimeSlotEntity.version` dùng `@Version`** (Optimistic Locking) — 2 request cùng đặt 1 slot thì request thứ hai nhận `OptimisticLockException` thay vì ghi đè âm thầm (kịch bản 7.6 trong `03_Luong_Chinh`).
4. **`TimeSlotJpaRepository#compareAndSetStatus`** — `UPDATE ... WHERE status = :expected` cho luồng đặt lịch tần suất cao. Lưu ý: `UPDATE` hàng loạt qua JPQL **không** tự tăng `@Version` nên phải set tay `t.version = t.version + 1`.
5. **Mọi cột trạng thái dùng enum** ánh xạ `@Enumerated(EnumType.STRING)` để Hibernate chặn giá trị sai ngay ở tầng Java.
6. **Đổi cấu trúc bảng phải thêm file mới** `V3__ten_thay_doi.sql` trong `db/migration/mysql` — **không sửa** V1/V2 đã chạy, vì Flyway kiểm tra checksum.

## 4. Ba sửa đổi thiết kế theo góp ý phản biện

| Sửa đổi ở CSDL | Ảnh hưởng tới tầng Entity |
|:---|:---|
| `users` bỏ `medical_center_id` + `role` ➔ tài khoản là **danh tính toàn cục** | `UserEntity` chỉ còn thông tin định danh. Quyền nhân sự nằm ở `UserMedicalCenterRoleEntity` (phạm vi theo chi nhánh) |
| `UserRole` bỏ `ROLE_PATIENT` | Chỉ còn `ROLE_DOCTOR`, `ROLE_STAFF`, `ROLE_ADMIN` — "bệnh nhân" là quyền mặc định của mọi tài khoản |
| `doctors` đổi sang `UNIQUE(user_id, specialty_id)` | `DoctorJpaRepository#findByUserId` trả `List` (1 người hành nghề nhiều khoa/chi nhánh) |
| Thêm bảng `payments` | `PaymentEntity`; `findByTransactionRef` chống webhook gọi lặp; `sumSucceededNetAmount` suy ra tình trạng thanh toán |
| Thêm `medicines` + `prescription_items` | `MedicalRecordEntity` bỏ trường `prescription`; `countMostPrescribedByCenter` là truy vấn chỉ làm được sau khi tách bảng |
| `appointments` thêm `medical_center_id` | Nơi duy nhất cho biết ca khám diễn ra ở chi nhánh nào |
| Thêm bảng `services` | `ServiceEntity` — bảng giá dịch vụ khám của từng chuyên khoa |

## 5. Đã kiểm thử thật

* ✅ **MariaDB 10.4.32** (đúng bản trong `C:\xampp`): chạy `V1 + V2` ➔ **17 bảng, 26 khóa ngoại, 18 CHECK, 12 UNIQUE**, seed thành công, không lỗi.
* ✅ **Ứng dụng khởi động thật**: Flyway migrate xong, Hibernate `ddl-auto=validate` PASS ➔ 17 Entity khớp tuyệt đối schema.
* ✅ **Đối chiếu 17 Entity ↔ schema thật**: 197/197 cột tồn tại và trùng khớp ràng buộc `NOT NULL`.
* ✅ **68/68 phép kiểm thử API Task 1 PASS** (`bash test-task1.sh`) — chi tiết trong [`TASK1_KHUNG_SUON.md`](./TASK1_KHUNG_SUON.md) mục 6.
* ✅ **7/7 phép thử dữ liệu sai bị DB từ chối đúng thiết kế**: cấp `ROLE_PATIENT` cho bảng quyền nhân sự, trùng quyền, tiền âm, hoàn quá số đã thu, webhook trùng `transaction_ref`, số lượng thuốc = 0, xóa ca khám đã có thanh toán. Bảng chi tiết ở mục 5.2 của [`Database_Design.md`](../04_Database_Design/Database_Design.md).
