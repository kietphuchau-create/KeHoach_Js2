# BÁO CÁO LỖI AI TRIAGE TỪ CHỐI CÂU TRẢ LỜI “ÂM Ỉ”

> **Dự án:** MedSched
>
> **Ngày phân tích:** 02/11/2026
>
> **Phạm vi:** Luồng đặt lịch bằng Trợ lý Y tế AI
>
> **Nhánh kiểm tra:** `fix/clab-106-ai-triage-booking-fixes`
> **Commit kiểm tra:** `c27681a`

---

## 1. Tóm tắt lỗi

Trong luồng đặt lịch bằng AI, trợ lý hỏi người dùng mô tả tính chất cơn đau:

> “Bạn khó chịu ở vị trí nào và cảm giác cụ thể ra sao, chẳng hạn âm ỉ, nhói, nóng rát, ngứa hay co thắt?”

Người dùng trả lời:

> “âm ỉ”

Nhưng giao diện lại từ chối với thông báo:

> “Nội dung ‘âm ỉ’ dường như không phải là một triệu chứng y tế hoặc vấn đề sức khỏe cần thăm khám.”

Đây là hành vi sai vì **“âm ỉ” chính là một lựa chọn lâm sàng mà hệ thống vừa gợi ý**.

---

## 2. Mức độ ảnh hưởng

- Làm gián đoạn luồng khảo sát triệu chứng và đặt lịch bằng AI.
- Người dùng không thể trả lời ngắn gọn theo đúng câu hỏi của trợ lý.
- Tạo cảm giác AI tự mâu thuẫn: vừa yêu cầu nhập “âm ỉ” nhưng ngay sau đó lại coi nội dung này là không hợp lệ.
- Các câu trả lời tương tự cũng có nguy cơ bị từ chối:
  - `nhói`
  - `quặn`
  - `siết chặt`
  - `đè nặng`
  - một số câu trả lời ngắn về vị trí hoặc mức độ đau
- Backend không nhận được request nên Gemini/OpenRouter và logic triage phía server không có cơ hội xử lý.

---

## 3. Cách tái hiện

1. Đăng nhập bằng tài khoản bệnh nhân.
2. Mở chức năng **Đặt lịch khám bằng AI**.
3. Nhập một mô tả ban đầu ngắn hoặc chưa đầy đủ, ví dụ `ho`.
4. Trợ lý hỏi thêm vị trí hoặc tính chất cảm giác khó chịu.
5. Nhập `âm ỉ`.
6. Giao diện hiển thị cảnh báo nội dung không phải triệu chứng y tế.

### Kết quả hiện tại

Frontend từ chối `âm ỉ` và không gửi câu trả lời đến `/api/ai/chat`.

### Kết quả mong đợi

Frontend phải xem `âm ỉ` là câu trả lời bổ sung hợp lệ, gửi cả câu trả lời và lịch sử hội thoại đến backend để tiếp tục khảo sát.

---

## 4. Nguyên nhân gốc

Lỗi xuất phát từ **sự không đồng bộ giữa bộ lọc frontend và logic hội thoại backend**.

### 4.1. Frontend sử dụng bộ lọc của triệu chứng ban đầu cho câu trả lời bổ sung

File liên quan:

```text
Source_code/frontend/src/shared/components/
BookingMethodModal/BookingMethodSelector.tsx
```

Hàm `isNonMedicalOrSpamInput()` chỉ chấp nhận nội dung có ít nhất một phần tử trong danh sách `HEALTH_INDICATORS`.

Danh sách hiện có các từ như:

```ts
'đau', 'nhức', 'mỏi', 'sốt', 'ho', 'ngứa', 'rát', 'buốt',
'mệt', 'nôn', 'chóng mặt', 'khó thở', 'răng', 'mắt', 'bụng'
```

Nhưng danh sách không có các câu trả lời mô tả tính chất cơn đau:

```text
âm ỉ, nhói, quặn, siết chặt, đè nặng
```

Do đó:

```ts
const hasHealthIndicator = HEALTH_INDICATORS.some(kw => lower.includes(kw));

if (!hasHealthIndicator) {
  return { isInvalid: true, ... };
}
```

vẫn trả về `isInvalid: true` cho câu trả lời `âm ỉ`.

### 4.2. Trạng thái hội thoại bị đưa về `CHOOSE_SYMPTOM`

Khi backend trả về một câu hỏi làm rõ nhưng chưa có `PATIENT_BOOKING_SUPPORT`, frontend thực hiện:

```ts
setAiStep(emergency ? 'EMERGENCY' : 'CHOOSE_SYMPTOM');
```

Vì vậy, câu trả lời tiếp theo bị xử lý như **triệu chứng đầu tiên**, không phải **câu trả lời cho câu hỏi làm rõ**.

Sau đó đoạn xử lý sau lại gọi bộ lọc nghiêm ngặt:

```ts
if (
  aiStep === 'CHOOSE_SYMPTOM' ||
  aiStep === 'EMERGENCY' ||
  aiStep === 'UNSUPPORTED_SPECIALTY' ||
  aiStep === 'DOCTOR_NO_SLOTS'
) {
  const validation = isNonMedicalOrSpamInput(text);
  // ...
}
```

Đây là nguyên nhân trực tiếp tạo ra cảnh báo trong ảnh.

### 4.3. Backend đã xử lý đúng nhưng không nhận được request

Trong `TriageController.java`, backend đã coi các từ sau là câu trả lời lâm sàng hợp lệ:

```java
"âm ỉ", "nhói", "quặn", "buốt", "nóng rát",
"bóp nghẹt", "đè nặng", "liên tục", "từng cơn"
```

Backend cũng có logic nhận biết câu hỏi làm rõ dựa trên lịch sử hội thoại.

Tuy nhiên, bộ lọc frontend chạy trước lời gọi API. Vì request bị chặn tại trình duyệt nên logic đúng ở backend không được sử dụng.

---

## 5. Clone GitHub có gây ra lỗi không?

**Không. Clone không tự tạo ra lỗi trong mã nguồn.**

Clone chỉ tải lại trạng thái đã được commit và push lên GitHub. Kết quả kiểm tra cho thấy:

- File frontend gây lỗi hiện không có chỉnh sửa local.
- Nhánh hiện tại đang ở commit `c27681a`.
- Các nhánh remote đã kiểm tra đều còn bộ lọc thiếu `âm ỉ`:
  - `origin/main`
  - `origin/develop`
  - `origin/feature/clab-142-ai-rag-chatbox-booking`
  - `origin/feature/clab-106-tan-spring-ai-triage`
- Lịch sử Git không có commit nào bổ sung `âm ỉ` vào `HEALTH_INDICATORS` hoặc sửa trạng thái hội thoại tương ứng.

### Khả năng đã xảy ra

Nếu lỗi từng được sửa trên một máy hoặc thư mục làm việc cũ thì bản sửa có thể:

1. Chỉ tồn tại ở working tree nhưng chưa được commit.
2. Đã commit cục bộ nhưng chưa push lên remote.
3. Nằm trên một nhánh khác nhưng chưa merge.
4. Bị ghi đè khi rebase hoặc giải quyết conflict.
5. Chỉ sửa backend, trong khi bộ lọc frontend vẫn giữ logic cũ.

Vì vậy, clone làm **lộ lại trạng thái lỗi đã có trên GitHub**, chứ không phải bản thân thao tác clone sinh ra bug.

---

## 6. Phương án sửa

### 6.1. Phương án tạm thời

Bổ sung các từ mô tả lâm sàng vào danh sách frontend:

```ts
const HEALTH_INDICATORS = [
  // Các từ hiện có...
  'âm ỉ', 'am i',
  'nhói', 'nhoi',
  'quặn', 'quan',
  'siết', 'siet',
  'đè nặng', 'de nang',
  'bóp nghẹt', 'bop nghet',
  'liên tục', 'lien tuc',
  'từng cơn', 'tung con',
];
```

### Ưu điểm

- Sửa nhanh trường hợp trong ảnh.
- Ít ảnh hưởng đến phần còn lại của luồng đặt lịch.

### Hạn chế

- Vẫn phụ thuộc vào danh sách từ khóa thủ công.
- Có thể tiếp tục phát sinh lỗi với các câu trả lời ngắn hợp lệ khác.
- Không giải quyết nguyên nhân trạng thái hội thoại bị gán sai.

---

### 6.2. Phương án đúng và bền vững

Tách rõ hai loại đầu vào:

1. **Triệu chứng ban đầu** — cần bộ lọc y tế tương đối nghiêm ngặt.
2. **Câu trả lời bổ sung** — cần được đánh giá theo câu hỏi ngay trước đó.

### Đề xuất trạng thái mới

Thêm trạng thái riêng, ví dụ:

```ts
type AiWizardStep =
  | 'CHOOSE_SYMPTOM'
  | 'AI_CLARIFICATION'
  | 'SELECT_DOCTOR_SLOT'
  | 'CONFIRM_PAYMENT'
  | 'COMPLETED';
```

Khi backend trả về:

```ts
assistantResponse.answerSource === 'CLARIFICATION'
```

frontend phải chuyển sang:

```ts
setAiStep('AI_CLARIFICATION');
```

Ở bước `AI_CLARIFICATION`:

- Chỉ áp dụng bộ lọc spam, phép tính và ký tự vô nghĩa.
- Không bắt buộc câu trả lời phải chứa một triệu chứng đầy đủ.
- Cho phép các câu trả lời ngắn có ý nghĩa theo ngữ cảnh như:
  - `âm ỉ`
  - `bên trái`
  - `2 ngày`
  - `khoảng 5/10`
  - `không sốt`
- Gửi `conversationContext` kèm câu trả lời đến backend.
- Để backend quyết định câu trả lời có đủ thông tin lâm sàng hay chưa.

### Luồng đề xuất

```text
CHOOSE_SYMPTOM
    ↓ mô tả ban đầu hợp lệ
/api/ai/chat
    ↓ backend yêu cầu làm rõ
AI_CLARIFICATION
    ↓ “âm ỉ” + lịch sử hội thoại
/api/ai/chat
    ↓ đủ dữ liệu triage
SELECT_DOCTOR_SLOT
```

---

## 7. Điều chỉnh bộ lọc frontend

Nên tách hàm hiện tại thành các hàm có trách nhiệm rõ ràng:

```ts
function validateInitialSymptom(text: string): ValidationResult {
  // Chặn spam và yêu cầu có tín hiệu y tế ban đầu.
}

function validateClinicalFollowUp(text: string): ValidationResult {
  // Chặn spam/gibberish nhưng cho phép câu trả lời ngắn theo ngữ cảnh.
}
```

Hoặc dùng một hàm có context:

```ts
function validateAiInput(
  text: string,
  context: 'INITIAL_SYMPTOM' | 'CLINICAL_FOLLOW_UP'
): ValidationResult {
  const spamCheck = isSpamOrMathOrGibberishInput(text);
  if (spamCheck.isInvalid) return spamCheck;

  if (context === 'CLINICAL_FOLLOW_UP') {
    return { isInvalid: false };
  }

  return validateInitialMedicalIndicator(text);
}
```

Backend vẫn là nơi quyết định cuối cùng vì backend có:

- lịch sử hội thoại;
- câu hỏi gần nhất của trợ lý;
- bộ nhận diện vị trí, tính chất, thời gian và mức độ;
- kiểm tra scope y tế;
- rate limit và guard dùng chung cho mọi client.

---

## 8. Kiểm thử cần bổ sung

Hiện backend đã có test cho một số câu trả lời làm rõ, nhưng frontend chưa có test tự động cho bộ lọc này.

### 8.1. Test frontend bắt buộc

| Trường hợp | Context | Kết quả mong đợi |
|---|---|---|
| `âm ỉ` | Clinical follow-up | Chấp nhận |
| `nhói` | Clinical follow-up | Chấp nhận |
| `quặn từng cơn` | Clinical follow-up | Chấp nhận |
| `bên trái` | Clinical follow-up | Chấp nhận |
| `2 ngày` | Clinical follow-up | Chấp nhận |
| `5/10` | Clinical follow-up | Chấp nhận |
| `không sốt` | Clinical follow-up | Chấp nhận |
| `2 + 2 bằng bao nhiêu` | Mọi context | Từ chối |
| `abc xyz` | Mọi context | Từ chối |
| `thủ đô Nhật Bản` | Initial symptom | Từ chối |

### 8.2. Test tích hợp backend

Bổ sung trường hợp:

```java
String context = "[USER] Tôi khó chịu ở bụng\n"
    + "[ASSISTANT] Cảm giác là âm ỉ, nhói hay quặn từng cơn?";

var request = new ChatRequest("âm ỉ", "PATIENT", context);
```

Kết quả mong đợi:

- Không trả về `UNRELATED_GUARDRAIL`.
- Không trả về lỗi rate limit hoặc spam.
- Tiếp tục hỏi thông tin còn thiếu hoặc thực hiện triage.

### 8.3. Test end-to-end

Kịch bản tối thiểu:

```text
Người dùng: ho
AI: hỏi vị trí/cảm giác/thời gian
Người dùng: âm ỉ
AI: tiếp tục khảo sát, không hiển thị cảnh báo “không phải triệu chứng”
```

---

## 9. Tiêu chí nghiệm thu bản sửa

Bản sửa được xem là hoàn tất khi đáp ứng tất cả điều kiện:

1. `âm ỉ` không còn bị frontend từ chối khi trả lời câu hỏi làm rõ.
2. Các câu `nhói`, `quặn`, `bên trái`, `2 ngày`, `5/10`, `không sốt` hoạt động đúng theo context.
3. Spam, phép tính và câu hỏi ngoài y tế vẫn bị chặn.
4. Request làm rõ được gửi đến `/api/ai/chat` cùng `conversationContext`.
5. Không ảnh hưởng luồng chọn nhanh thẻ triệu chứng.
6. Không ảnh hưởng cảnh báo cấp cứu.
7. Có test frontend và backend chống tái phát.
8. Chạy thành công frontend type-check/build và backend test liên quan.

---

## 10. Khuyến nghị quy trình Git

Để tránh lỗi đã sửa xuất hiện lại sau khi clone:

1. Tạo nhánh sửa lỗi riêng từ `develop`.
2. Commit cả code và test trong cùng một commit hoặc cùng PR.
3. Push nhánh lên GitHub trước khi đổi máy hoặc xóa workspace.
4. Tạo Pull Request vào `develop` và chờ CI chạy thành công.
5. Sau khi merge, clone thử vào thư mục mới và chạy lại kịch bản lỗi.
6. Không chỉ kiểm tra bằng trạng thái local chưa commit.

Tên nhánh đề xuất:

```text
fix/clab-ai-triage-clinical-follow-up-validation
```

Tên commit đề xuất:

```text
fix(ai-booking): accept contextual clinical follow-up answers
```

---

## 11. Kết luận

Đây là **lỗi hồi quy ở frontend** do bộ lọc triệu chứng ban đầu được tái sử dụng sai cho câu trả lời làm rõ. Backend đã hiểu `âm ỉ`, nhưng frontend chặn request trước khi backend xử lý.

Clone GitHub không tự tạo bug; clone chỉ khôi phục phiên bản đã được push. Bằng chứng Git hiện tại cho thấy bản sửa hoàn chỉnh chưa tồn tại trong các nhánh remote đang kiểm tra.

Giải pháp bền vững là quản lý riêng trạng thái `AI_CLARIFICATION`, sử dụng validation theo context và bổ sung test frontend cho các câu trả lời lâm sàng ngắn.
