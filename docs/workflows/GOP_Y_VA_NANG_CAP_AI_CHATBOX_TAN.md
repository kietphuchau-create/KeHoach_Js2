# 🩺 BẢNG GÓP Ý & ĐỀ XUẤT NÂNG CẤP AI CHATBOX MEDSCHED — GỬI BẠN TÂN
## Đề tài: Trợ lý Y tế Đa vai trò (Multi-Role Clinic Assistant & MCP) — Ticket CLAB-132

> **Người gửi:** Châu Tuấn Kiệt (*Project Leader / System Architect*)  
> **Người nhận:** Bạn Tân (*AI Engineer / Tester*)  
> **Dự án:** MedSched Smart Clinic Platform (Java Spring Boot 3 & Next.js 15)  
> **Nhánh liên quan:** `feature/clab-132-hoan-thien-ai-noi-bo-va-mcp` ➔ `develop`  
> **Ngày lập:** 20/10/2026  

---

## 🌟 1. ĐÁNH GIÁ CHUNG VỀ SẢN PHẨM CỦA ÔNG (RẤT TỐT & BÀI BẢN)

Trước hết, tôi và cả nhóm đánh giá **rất cao khối lượng công việc và tư duy kỹ thuật** mà ông đã đóng góp trong đợt PR này (31 files, +2716 dòng code):

* ✅ **Hội thoại đa lượt (Multi-turn clarification):** Ông giải quyết cực tốt bài toán gom triệu chứng nhiều lần, xử lý từ ngữ phủ định (*"không sốt, không khó thở"*) không bị nhận nhầm.
* ✅ **Kết nối CSDL MySQL thật:** Trích xuất đúng chuyên khoa, gợi ý đúng bác sĩ kèm lịch trống và giá khám, không bị "ảo giác" (hallucination).
* ✅ **Nút 1-Click sang `/booking`:** Hàm `openSuggestedBooking` tự động truyền Query Params và điền sẵn thông tin vào phiếu đặt lịch là điểm cộng trải nghiệm rất sáng giá.
* ✅ **Cảnh báo an toàn y tế (Safety Guardrail):** Chặn các ca cấp cứu (đau ngực dữ dội, khó thở, ngất xỉu) và hướng dẫn gọi 115 chuẩn y khoa.
* ✅ **Kiến trúc bền bỉ:** Fallback 3 tầng (OpenRouter ➔ Gemini ➔ RAG nội bộ) và Bucket4j chống spam.

---

## 💡 2. VẤN ĐỀ THỰC CHIẾN: GÓC NHÌN NGƯỜI DÙNG THỰC TẾ

Trong buổi thảo luận vừa qua, nhóm nhận thấy một rào cản UX lớn:
> *"Người bệnh trong đời thực đang mệt mỏi, đau đớn, hoặc người lớn tuổi **chẳng ai có tâm trạng ngồi gõ một đoạn văn miêu tả triệu chứng dài dòng cả**."*

### Hiện trạng thực tế:
* Người dùng chỉ gõ **2 - 4 từ cộc lốc**: *"đau bụng"*, *"sốt 3 hôm"*, *"nhức đầu quá"*, hoặc viết tắt *"bi ngua da"*.
* Hiện tại trong `UniversalAiAssistantModal.tsx`, ở mỗi lượt phản hồi, người bệnh **vẫn bắt buộc phải dùng bàn phím gõ chữ** (nhập *"cổ"*, nhập *"2 ngày trước"*).

### Giải pháp nâng cấp: Triết lý **"Tap, Don't Type" (Chạm, Không cần gõ)**
Thay vì bắt bệnh nhân gõ phím, **AI sẽ chủ động dẫn dắt bằng các Nút bấm lựa chọn nhanh (Quick-reply Chips / Trắc nghiệm)**. Người bệnh chỉ cần lấy ngón tay chạm cộp cộp trên màn hình điện thoại là xong!

---

## 🎯 3. BA (03) ĐỀ XUẤT NÂNG CẤP CHI TIẾT

```
Màn hình chào ─────────► [Bấm chip: Đau bụng]
                              │
                              ▼
AI hỏi vị trí ─────────► [Bấm chip: Trên rốn / Dạ dày]
                              │
                              ▼
AI hỏi kèm theo ───────► [Bấm chip: Ợ chua, buồn nôn]
                              │
                              ▼
AI chốt khoa & Bác sĩ ─► [Nút 1-Click: Đặt lịch khám ngay]
```

---

### Đề xuất 1: Bong bóng triệu chứng mở đầu (Welcome Quick-Pills)
Ngay dưới tin nhắn chào mừng, thay vì để ô input trống trơn, hiển thị sẵn 5–6 nút bong bóng các vấn đề thường gặp:

* 🔘 `[🔥 Sốt, Cảm cúm]`
* 🔘 `[🤢 Đau bụng, Tiêu hóa]`
* 🔘 `[🤕 Đau đầu, Chóng mặt]`
* 🔘 `[🔴 Ngứa, Dị ứng da]`
* 🔘 `[🦴 Đau nhức xương khớp]`
* 🔘 `[🩺 Khám sức khỏe tổng quát]`

👉 Bệnh nhân vừa mở popup lên, chỉ cần bấm vào `[🤢 Đau bụng, Tiêu hóa]` là AI tự hiểu và kích hoạt luồng hỏi gạn lọc ngay, **không tốn 1 giây gõ phím**.

---

### Đề xuất 2: Nút bấm phản hồi nhanh theo ngữ cảnh (Contextual Quick Chips)
Khi AI hỏi câu tiếp theo, AI trả về kèm một mảng `quickReplies`. Giao diện sẽ render các nút này ngay dưới tin nhắn của AI:

* **Ví dụ 1 — Khi AI hỏi vị trí:**
  * 🔘 `[Trên rốn / Dạ dày]`
  * 🔘 `[Bụng dưới bên phải]`
  * 🔘 `[Quanh rốn]`
  * 🔘 `[Đau quặn toàn bụng]`

* **Ví dụ 2 — Khi AI hỏi thời gian:**
  * 🔘 `[Mới bị hôm nay]`
  * 🔘 `[Được 2 - 3 ngày]`
  * 🔘 `[Kéo dài hơn 1 tuần]`

* **Ví dụ 3 — Khi AI hỏi triệu chứng kèm theo:**
  * 🔘 `[Ợ chua, nóng rát cổ]`
  * 🔘 `[Buồn nôn / Tiêu chảy]`
  * 🔘 `[Không có triệu chứng khác]`

---

### Đề xuất 3: Đoạn code mẫu tích hợp nhanh vào Frontend

Ông có thể bổ sung trường `quickReplies?: string[]` vào `Message` interface trong `UniversalAiAssistantModal.tsx` như sau:

```tsx
// 1. Thêm trường quickReplies vào Message interface
interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  quickReplies?: string[]; // Danh sách các nút bấm chọn nhanh
  toolResult?: any;
  // ...
}

// 2. Render các nút bấm chọn nhanh bên dưới tin nhắn AI
{msg.sender === 'ai' && msg.quickReplies && msg.quickReplies.length > 0 && (
  <div className="flex flex-wrap gap-1.5 mt-2 pt-1 border-t border-purple-100/60">
    {msg.quickReplies.map((reply, idx) => (
      <button
        key={idx}
        type="button"
        disabled={loading}
        onClick={() => handleSendMessage(reply)} // Bấm nút là gửi text ngay!
        className="px-2.5 py-1 text-xs font-medium text-purple-700 bg-white hover:bg-purple-100 hover:text-purple-900 border border-purple-200 rounded-full transition shadow-2xs active:scale-95 cursor-pointer"
      >
        {reply}
      </button>
    ))}
  </div>
)}
```

---

## 🚀 4. QUY TRÌNH MỞ LẠI PULL REQUEST VÀO REPO CHÍNH

Chiều nay link PR ông gửi (`github.com/thas109/KeHoach_Js2/pull/1`) đang nằm ở **fork cá nhân** và bị dính cờ **Draft (Bản nháp)** nên tôi chưa merge được.

Ông giúp nhóm làm lại theo các bước này nhé:
1. Vào kho chính của nhóm: 👉 **https://github.com/kietphuchau-create/KeHoach_Js2/pulls**
2. Bấm nút xanh **"New pull request"**.
3. Bấm vào chữ nhỏ màu xanh: **"compare across forks"**.
4. Chọn đúng:
   * **Base repository:** `kietphuchau-create/KeHoach_Js2` | **Base branch:** `develop` *(chọn develop, không chọn main)*
   * **Head repository:** `thas109/KeHoach_Js2` | **Compare branch:** `feature/clab-132-hoan-thien-ai-noi-bo-va-mcp`
5. Bấm **"Create pull request"** *(chọn tạo chính thức, không chọn Draft)*.
6. Xong ném link qua Zalo, tôi sẽ review và bấm **Merge** ngay vào `develop` để cả nhóm cùng test!

---

*Cảm ơn Tân rất nhiều vì đã hoàn thành phần AI cực kỳ xuất sắc và chuyên nghiệp! Có thêm phần Quick-chips này nữa thì sản phẩm của nhóm mình khi bảo vệ trước Thầy Bình sẽ đạt điểm 10 tuyệt đối!*
