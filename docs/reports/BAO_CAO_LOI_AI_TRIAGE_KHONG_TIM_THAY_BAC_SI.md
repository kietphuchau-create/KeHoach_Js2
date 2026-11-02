# Báo cáo lỗi AI Triage báo sai không có bác sĩ chuyên khoa

## 1. Thông tin chung

- **Hệ thống:** MedSched
- **Phân hệ:** Đặt lịch khám bằng Trợ lý Y tế AI
- **Ngày phân tích và sửa lỗi:** 02/11/2026
- **Mức độ ảnh hưởng:** Cao
- **Trạng thái:** Đã sửa trong mã nguồn frontend
- **Tệp được sửa:** `Source_code/frontend/src/shared/components/BookingMethodModal/BookingMethodSelector.tsx`

## 2. Mô tả lỗi

Khi bệnh nhân mô tả triệu chứng thuộc chuyên khoa Da liễu, AI nhận diện đúng chuyên khoa nhưng lại hiển thị thông báo:

> Hệ thống MedSched chưa có bác sĩ chuyên môn phụ trách chuyên khoa này.

Khu vực danh sách bác sĩ phía dưới đồng thời hiển thị `0 Bác sĩ`, mặc dù cơ sở dữ liệu đã có bác sĩ Da liễu đang hoạt động và có lịch khám.

Ví dụ luồng gây lỗi:

1. Bệnh nhân mở chức năng đặt lịch bằng AI.
2. Chọn hoặc mô tả triệu chứng về da.
3. AI hỏi các câu làm rõ biểu hiện, thời gian và triệu chứng đi kèm.
4. Sau câu trả lời cuối, AI định hướng đến `Chuyên Khoa Da Liễu & Thẩm Mỹ`.
5. Hệ thống lại chuyển sang trạng thái `UNSUPPORTED_SPECIALTY` và báo không có bác sĩ.

## 3. Kết quả mong đợi

Khi database có bác sĩ phù hợp, hệ thống phải:

1. Tải được danh sách bác sĩ từ API.
2. Ghép chuyên khoa hoặc nhóm triệu chứng với bác sĩ phù hợp.
3. Kiểm tra lịch trực và số khung giờ còn trống.
4. Đề xuất bác sĩ và khung giờ cho bệnh nhân.
5. Chỉ hiển thị `UNSUPPORTED_SPECIALTY` khi đã tải dữ liệu thành công và thực sự không có bác sĩ phù hợp.

## 4. Kết quả kiểm tra dữ liệu

Trong quá trình phân tích, dữ liệu được ghi nhận như sau:

- Database có chuyên khoa `DERMATOLOGY`.
- Có bác sĩ Da liễu đang hoạt động.
- Bác sĩ có các khung giờ `AVAILABLE` trong tương lai.
- API danh sách bác sĩ có trả về dữ liệu bác sĩ.

Vì vậy, nguyên nhân không nằm ở việc thiếu bác sĩ hoặc thiếu lịch khám trong database.

## 5. Nguyên nhân gốc

### 5.1. Danh sách bác sĩ được tải quá muộn

Frontend lưu danh sách bác sĩ trong state `dbDoctors`. Trước khi sửa, API bác sĩ chỉ được gọi khi AI đã chuyển đến một trong hai bước:

```ts
if (aiStep !== 'INPUT_LOCATION' && aiStep !== 'SELECT_DOCTOR_SLOT') return;
```

Trong khi đó, việc xác định phòng khám có bác sĩ đúng chuyên khoa hay không lại diễn ra ngay sau bước `CLARIFY_DETAILS`.

Luồng lỗi thực tế:

```text
Mở AI
  -> CHOOSE_SYMPTOM
  -> CLARIFY_DETAILS
  -> kiểm tra dbDoctors
  -> dbDoctors vẫn là []
  -> matchingDoctors.length === 0
  -> UNSUPPORTED_SPECIALTY
```

Như vậy, mảng rỗng do **chưa tải dữ liệu** bị hiểu sai thành **đã tải dữ liệu và không có bác sĩ**.

### 5.2. Có race condition giữa giao diện và API

Nếu bệnh nhân trả lời nhanh, khảo sát có thể hoàn tất trước request lấy danh sách bác sĩ. Code cũ không đợi request và cũng không tải lại trước khi kết luận.

Đây là race condition: kết quả phụ thuộc vào việc người dùng trả lời nhanh hay chậm và tốc độ phản hồi của API.

### 5.3. Nội dung thông báo được viết cứng

Thông báo `UNSUPPORTED_SPECIALTY` cũ chứa tên bác sĩ và chuyên khoa được viết trực tiếp trong frontend. Danh sách này có thể khác database và gây ra mâu thuẫn như:

- Phần đầu báo không có bác sĩ.
- Nội dung viết cứng phía dưới lại liệt kê bác sĩ Da liễu.
- Widget thực tế vẫn hiển thị `0 Bác sĩ` vì `dbDoctors` đang rỗng.

## 6. Có phải do clone dự án từ GitHub không?

Không phải thao tác `git clone` tự tạo ra lỗi. Clone chỉ tải đúng trạng thái mã nguồn đã được commit trên repository.

Lỗi xuất hiện lại sau khi clone thường do một trong các trường hợp sau:

1. Bản sửa trước đó chỉ tồn tại ở máy cũ nhưng chưa được commit và push.
2. Bản sửa nằm trên nhánh khác nhưng máy mới đang checkout nhánh cũ.
3. Pull request chứa bản sửa chưa được merge vào nhánh đang clone.
4. Repository chứa lại điều kiện tải dữ liệu quá muộn nêu trên.
5. Database được khôi phục nhưng frontend vẫn là phiên bản cũ.

Các lệnh có thể dùng để kiểm tra:

```bash
git branch --show-current
git log --oneline --all -- Source_code/frontend/src/shared/components/BookingMethodModal/BookingMethodSelector.tsx
git status
git remote -v
```

Kết luận: **Git clone không sinh bug; clone làm lộ việc bản sửa cũ chưa có trong nhánh hoặc commit được tải về.**

## 7. Cách sửa đã áp dụng

### 7.1. Tải bác sĩ ngay khi mở chế độ AI

Điều kiện tải dữ liệu được chuyển từ phụ thuộc vào bước cuối của wizard sang phụ thuộc vào chế độ AI:

```ts
if (viewMode !== 'ai') return;
```

Kết quả: danh sách bác sĩ bắt đầu được tải ngay khi bệnh nhân mở trợ lý AI, trước khi hoàn thành bảng câu hỏi.

### 7.2. Chuẩn hóa dữ liệu bác sĩ bằng một hàm dùng chung

Hàm `mapApiDoctors` được tách riêng để:

- Chuẩn hóa họ tên và học hàm.
- Ánh xạ tên chuyên khoa sang nhóm triệu chứng.
- Xác định `specialtyCode` dự phòng khi API chưa cung cấp mã.
- Chuẩn hóa phòng khám, phí khám, giới tính và thông tin chuyên gia.
- Dùng cùng một cách ánh xạ cho request ban đầu và request xác minh lại.

### 7.3. Xác minh lại trước khi kết luận không hỗ trợ

`handleAdvanceClarify` được chuyển thành hàm bất đồng bộ. Khi danh sách bác sĩ đang tải hoặc đang rỗng, frontend gọi lại API trước khi kiểm tra chuyên khoa:

```ts
if (isDoctorsLoading || doctorPool.length === 0) {
  const latestDoctors = await api.getDoctors();
  doctorPool = Array.isArray(latestDoctors)
    ? mapApiDoctors(latestDoctors)
    : [];
}
```

Nếu API lỗi, hệ thống không còn báo sai rằng không có bác sĩ. Thay vào đó, AI thông báo chưa thể đồng bộ dữ liệu và yêu cầu thử lại.

### 7.4. Bỏ danh sách bác sĩ viết cứng

Danh sách trong thông báo giới hạn chuyên môn hiện được nhóm trực tiếp từ `doctorPool` theo `specialtyName`.

Nhờ đó:

- Nội dung luôn bám theo database.
- Không còn tên bác sĩ giả hoặc đã bị xóa.
- Số lượng và danh sách hiển thị nhất quán với widget.

## 8. Luồng sau khi sửa

```text
Mở chế độ AI
  -> gọi API danh sách bác sĩ ngay lập tức
  -> chuẩn hóa và lưu dbDoctors
  -> bệnh nhân hoàn thành CLARIFY_DETAILS
  -> nếu dữ liệu vẫn đang tải/rỗng: gọi API xác minh lại
  -> lọc bác sĩ theo categoryKeys, specialtyCode và specialtyName
  -> kiểm tra lịch trực và slot còn trống
  -> có bác sĩ: chuyển SELECT_DOCTOR_SLOT
  -> thực sự không có bác sĩ: chuyển UNSUPPORTED_SPECIALTY
  -> API lỗi: thông báo lỗi đồng bộ, không kết luận sai
```

## 9. Kiểm tra sau sửa

Đã thực hiện các kiểm tra kỹ thuật sau:

```bash
cd Source_code/frontend
.\node_modules\.bin\tsc.cmd --noEmit
npm run build
```

Kết quả:

- TypeScript kiểm tra thành công, không có lỗi kiểu dữ liệu.
- Next.js production build thành công.
- Toàn bộ 27 trang được tạo thành công.

Tại thời điểm kiểm tra cuối, backend cổng `8788` chưa chạy nên không thể thực hiện lại kiểm thử API trực tiếp. Đây là trạng thái vận hành riêng, không phải lỗi biên dịch của bản sửa frontend.

## 10. Kịch bản kiểm thử thủ công đề xuất

### Trường hợp 1: Có bác sĩ đúng chuyên khoa và còn lịch

1. Khởi động database, backend và frontend.
2. Đăng nhập tài khoản bệnh nhân.
3. Mở đặt lịch bằng AI.
4. Chọn `Ngứa, dị ứng da` hoặc mô tả triệu chứng da.
5. Hoàn thành các câu hỏi làm rõ.
6. Xác nhận AI đề xuất bác sĩ Da liễu.
7. Xác nhận có khung giờ để đặt lịch.
8. Không được xuất hiện `UNSUPPORTED_SPECIALTY`.

### Trường hợp 2: Người dùng trả lời rất nhanh

1. Mở lại AI bằng nút làm mới.
2. Trả lời liên tục các câu hỏi ngay khi nút xuất hiện.
3. Xác nhận hệ thống vẫn chờ hoặc tải lại danh sách bác sĩ.
4. Không được hiển thị `0 Bác sĩ` chỉ vì request chưa hoàn tất.

### Trường hợp 3: Backend tạm thời không truy cập được

1. Dừng backend hoặc chặn API bác sĩ.
2. Hoàn thành khảo sát AI.
3. Xác nhận AI thông báo chưa thể đồng bộ danh sách bác sĩ.
4. Hệ thống không được khẳng định phòng khám không có chuyên khoa.

### Trường hợp 4: Chuyên khoa thực sự chưa có bác sĩ

1. Chọn nhóm triệu chứng thuộc chuyên khoa không có trong database.
2. Hoàn thành khảo sát.
3. Xác nhận hệ thống hiển thị giới hạn chuyên môn.
4. Danh sách bác sĩ thay thế phải lấy đúng từ database, không phải dữ liệu viết cứng.

## 11. Biện pháp tránh tái diễn

1. Commit và push bản sửa lên đúng nhánh dùng chung.
2. Merge pull request vào nhánh trung tâm trước khi clone sang máy khác.
3. Không dùng mảng rỗng để biểu diễn đồng thời cả `đang tải`, `tải lỗi` và `không có dữ liệu`.
4. Luôn kiểm tra trạng thái tải trước khi đưa ra kết luận nghiệp vụ.
5. Không viết cứng tên bác sĩ, lịch khám hoặc chuyên khoa trong frontend.
6. Bổ sung kiểm thử cho trường hợp request API chậm.
7. Sau khi clone, kiểm tra branch, commit hiện tại, biến môi trường và trạng thái migration/seed database.

## 12. Kết luận

Lỗi xảy ra do frontend kiểm tra danh sách bác sĩ trước khi danh sách này được tải từ API. Database vẫn có bác sĩ và lịch khám, nhưng state `dbDoctors` tạm thời là mảng rỗng khiến hệ thống chuyển nhầm sang trạng thái không hỗ trợ chuyên khoa.

Bản sửa đã thay đổi thời điểm tải dữ liệu, thêm bước xác minh trước khi kết luận, xử lý an toàn khi API lỗi và loại bỏ danh sách bác sĩ viết cứng. Việc clone từ GitHub chỉ làm lỗi xuất hiện lại nếu bản sửa cũ chưa được commit, push hoặc merge vào nhánh được clone.
