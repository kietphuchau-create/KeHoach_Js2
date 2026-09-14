# API Spec — MedSched

Thư mục này chứa **API Spec**: tài liệu đặc tả API của dự án.

| File | Nội dung |
|:---|:---|
| `openapi.yaml` | Bản đặc tả chuẩn **OpenAPI 3.0.3** — 34 endpoint, 32 schema |
| `README.md` | File bạn đang đọc — giải thích cách dùng và các quy ước |

---

## 1. API Spec là gì và tại sao cần

API Spec là bản **contract** (cam kết) mô tả chính xác mỗi API: gọi vào đâu, gửi
gì lên, nhận lại gì, lỗi ra sao. Cả Backend và Frontend cùng nhìn vào một tài liệu
duy nhất.

**Backend được gì:** có chuẩn để code theo. Khi nhờ AI sinh code, đưa kèm spec này
thì AI bám đúng tên field, đúng status code, không tự chế thêm field lạ hay đặt tên
kiểu khác.

**Frontend được gì:** dựng được **mock server** từ spec và làm UI ngay, không phải
chờ Backend làm xong. Khi Backend xong, đổi URL là chạy — không phải sửa code vì
response đã đúng như cam kết.

---

## 2. Cách dùng

### 2.1. Xem dạng giao diện (Swagger UI)

Cách nhanh nhất: mở https://editor.swagger.io → menu **File → Import file** → chọn
`openapi.yaml`. Trang web sẽ hiện danh sách API, bấm vào từng cái xem request/response.

### 2.2. Import vào Postman

Postman → **Import** → chọn `openapi.yaml` → Postman tự sinh sẵn collection đầy đủ
các request kèm ví dụ body.

Sau khi import, tạo biến môi trường:
- `baseUrl` = `http://localhost:8080`
- `token` = dán `accessToken` lấy được sau khi gọi `POST /api/v1/auth/login`

### 2.3. Frontend chạy mock server (không cần Backend)

```bash
npx @stoplight/prism-cli mock openapi.yaml --port 4010
```

Mock server chạy ở `http://localhost:4010` và trả về dữ liệu mẫu đúng theo spec.
Frontend chỉ cần trỏ `NEXT_PUBLIC_API_URL` vào đó là làm UI được ngay.

---

## 3. Giải thích các thành phần trong `openapi.yaml`

| Thành phần | Nghĩa là gì |
|:---|:---|
| **endpoint** (`paths`) | Đường dẫn API, ví dụ `/api/v1/auth/login` |
| **method** | Động từ HTTP: `GET` (lấy dữ liệu), `POST` (tạo mới), `PUT` (cập nhật toàn bộ), `PATCH` (cập nhật một phần), `DELETE` (xóa) |
| **header** | Thông tin kèm theo request. Quan trọng nhất: `Authorization: Bearer <accessToken>` và `Content-Type: application/json` |
| **path params** | Tham số nằm trong đường dẫn, ví dụ `{userId}` trong `/api/v1/admin/users/{userId}` |
| **query params** | Tham số sau dấu `?`, ví dụ `?page=0&size=20&sort=email,asc` |
| **request body** | Dữ liệu JSON gửi lên (chỉ có ở POST/PUT/PATCH) |
| **response** | Dữ liệu JSON trả về |
| **status code** | Mã kết quả HTTP — xem bảng mục 4 |
| **schema** | Định nghĩa cấu trúc một đối tượng JSON (có field nào, kiểu gì, bắt buộc không) |
| **`$ref`** | Tham chiếu tới schema đã định nghĩa sẵn, tránh viết lặp |
| **`components`** | Nơi khai báo dùng chung: schema, parameter, response, securityScheme |
| **`securitySchemes`** | Cách xác thực. Dự án dùng `bearerAuth` = JWT trong header Authorization |
| **`nullable: true`** | Field có thể là `null`, Frontend phải xử lý trường hợp này |
| **`enum`** | Field chỉ nhận một số giá trị cố định, ví dụ `status` chỉ nhận `CONFIRMED`, `CHECKED_IN`... |

> Các từ chuyên ngành như *endpoint, request, response, header, param, schema,
> token, pagination, filter, sort* được giữ nguyên tiếng Anh vì đây là thuật ngữ
> chuẩn trong tài liệu kỹ thuật, dịch ra sẽ khó đối chiếu với code và tài liệu Spring.

---

## 4. Status code dùng trong dự án

| Code | Tên | Khi nào trả về |
|:---:|:---|:---|
| **200** | OK | Lấy / cập nhật dữ liệu thành công |
| **201** | Created | Tạo mới thành công (đăng ký, tạo tài khoản, đặt lịch) |
| **204** | No Content | Thành công nhưng không trả dữ liệu (đổi mật khẩu, xóa) |
| **400** | Bad Request | Dữ liệu gửi lên sai (thiếu field, sai định dạng, sai nghiệp vụ) |
| **401** | Unauthorized | Chưa đăng nhập, thiếu token, token sai hoặc hết hạn |
| **403** | Forbidden | Đã đăng nhập nhưng **không đủ quyền**, hoặc tài khoản bị khóa |
| **404** | Not Found | Không tìm thấy dữ liệu theo id/mã đã gửi |
| **409** | Conflict | Trùng dữ liệu (email đã đăng ký, trùng mã) hoặc tranh chấp (slot vừa bị người khác giữ) |

**Phân biệt 401 và 403:** 401 = "bạn là ai?" (chưa đăng nhập). 403 = "biết bạn là
ai rồi, nhưng bạn không được phép".

---

## 5. Khuôn lỗi dùng chung

Mọi API khi lỗi đều trả về cùng một cấu trúc, nên Frontend chỉ cần viết **một hàm**
xử lý lỗi duy nhất:

```json
{
  "timestamp": "2026-09-14T06:45:47Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Dữ liệu gửi lên không hợp lệ",
  "path": "/api/v1/auth/register",
  "fieldErrors": {
    "email": "Email không đúng định dạng",
    "password": "Mật khẩu phải từ 8 đến 72 ký tự"
  }
}
```

- `message`: câu tiếng Việt, hiển thị thẳng cho người dùng được.
- `fieldErrors`: chỉ xuất hiện khi lỗi validation. Key là tên field → Frontend tô đỏ đúng ô nhập đó.

---

## 6. Chuẩn API List (pagination, filter, search, sort)

Mọi API trả về **danh sách** phải theo chuẩn dưới đây.

### 6.1. Query params

| Param | Ý nghĩa | Mặc định |
|:---|:---|:---|
| `page` | **Pagination** — số trang, bắt đầu từ `0` | `0` |
| `size` | Số bản ghi mỗi trang, tối đa `100` | `20` |
| `sort` | **Sort** — dạng `field,direction`, ví dụ `email,asc` | `createdAt,desc` |
| `q` | **Search** — tìm gần đúng, không phân biệt hoa thường | (rỗng) |
| *(tùy API)* | **Filter** — lọc chính xác theo giá trị, ví dụ `role`, `centerId`, `specialtyId` | (không lọc) |

**Phân biệt search và filter:** `q` là tìm gần đúng trên chữ (gõ "admin" ra
`admin@medsched.vn`), còn filter là lọc chính xác theo một giá trị cố định
(`role=ROLE_DOCTOR`).

**Sort có whitelist:** chỉ cho sort theo `createdAt`, `updatedAt`, `email`,
`fullName`, `active`. Gửi field ngoài danh sách sẽ nhận **400**. Làm vậy để người
dùng không sort theo cột nhạy cảm (như `passwordHash`) hay gây lỗi truy vấn.

### 6.2. Response envelope

```json
{
  "items": [],
  "page": 0,
  "size": 20,
  "totalItems": 42,
  "totalPages": 3
}
```

`totalItems` và `totalPages` để Frontend vẽ thanh phân trang.

### 6.3. Endpoint nào đã theo chuẩn?

| Endpoint | Pagination | Filter | Search | Sort |
|:---|:---:|:---:|:---:|:---:|
| `GET /api/v1/admin/users` | ✅ | ✅ `role`, `centerId` | ✅ `q` | ✅ |
| `GET /api/v1/specialties` | ❌ | ✅ `centerId` | ❌ | ❌ |
| `GET /api/v1/services` | ❌ | ✅ `specialtyId` | ❌ | ❌ |
| `GET /api/v1/medical-centers` | ❌ | ❌ | ❌ | ❌ |
| `GET /api/appointments/patient/{id}` | ❌ | ❌ | ❌ | ⚠️ cố định mới nhất trước |

Bốn endpoint cuối hiện trả **mảng thuần** vì dữ liệu còn ít (2 chi nhánh, 5 chuyên
khoa, 3 dịch vụ). Khi số bản ghi tăng thì nâng cấp theo đúng chuẩn ở mục 6.1–6.2.
Việc nâng cấp **sẽ làm hỏng** code Frontend đang đọc mảng trực tiếp, nên phải báo
trước cho cả nhóm.

---

## 7. Luồng xác thực (authentication flow)

1. `POST /api/v1/auth/login` → nhận `accessToken` (sống 30 phút) và `refreshToken` (sống 7 ngày).
2. Mọi request sau đó gắn header: `Authorization: Bearer <accessToken>`.
3. Khi `accessToken` hết hạn (API trả 401) → gọi `POST /api/v1/auth/refresh` với `refreshToken` để lấy token mới.
4. `refreshToken` **không** gọi được API nghiệp vụ, và `accessToken` **không** dùng để refresh được — hai loại token phân biệt bằng claim `typ` bên trong JWT.

**Về `roles` trong response:** ngoài role thường (`ROLE_STAFF`) còn có role kèm
phạm vi chi nhánh (`ROLE_STAFF@<medicalCenterId>`). Mọi tài khoản luôn có
`ROLE_PATIENT` vì ai cũng có thể đi khám.

---

## 8. Tài khoản để test

Mật khẩu chung: **`Medsched@123`**

| Email | Role |
|:---|:---|
| `benhnhan.demo@gmail.com` | Khách hàng (không có quyền nhân sự) |
| `dr.minhanh@medsched.vn` | Bác sĩ (trực 2 chi nhánh) |
| `letan.q1@medsched.vn` | Lễ tân |
| `admin@medsched.vn` | Admin |

---

## 9. Quy tắc khi sửa spec

1. **Sửa spec trước, code sau.** Spec là chuẩn, code bám theo spec.
2. **Không đổi tên field đã có** khi Frontend đang dùng. Cần đổi thì báo cả nhóm trước.
3. **Thêm field mới thì để `nullable`** hoặc có giá trị mặc định, để client cũ không vỡ.
4. **Sửa xong phải validate**, đừng commit file YAML lỗi cú pháp:
   ```bash
   npx --yes js-yaml openapi.yaml > /dev/null && echo "YAML OK"
   ```
5. Spec này đã được **đối chiếu tự động với code**: 34 endpoint trong spec khớp
   đúng 34 endpoint trong controller, không thừa không thiếu.
