---
name: create-github-pr
description: Quy trình Git Flow chuẩn của nhóm MedSched theo hướng dẫn của thầy Bình. Sử dụng khi cần tạo nhánh feature/clab-<ticket>-<detail> từ nhánh trung tâm develop, commit chuẩn, push và tạo GitHub Pull Request vào develop (không làm trực tiếp vào main).
---

# Create GitHub PR — MedSched (Git Flow Chuẩn Nhóm)

Quy trình Git của nhóm MedSched theo chỉ đạo của thầy Trương Thanh Bình. **Không bao giờ commit thẳng vào `main` hay `develop`.**

## 1. Mô hình nhánh (Branch Model)

```
main                    <- Bản ổn định, chỉ nhận PR từ develop (dùng để demo, nộp bài).
  └── develop           <- Nhánh trung tâm của cả nhóm. Mọi feature đều tách ra và gộp vào đây.
        ├── feature/clab-101-dat-lich-kham
        ├── feature/clab-102-checkin-qr
        ├── feature/clab-122-quan-tri-nguoi-dung
        └── fix/clab-103-sai-ma-loi-409
```

- **`main`**: Bản release/demo ổn định nhất. **Chỉ** nhận PR từ `develop`.
- **`develop`**: Nhánh tích hợp trung tâm. Mọi thành viên luôn lấy code mới nhất từ đây để bắt đầu làm.
- **Nhánh Feature/Fix**: Tách từ `develop`, sau khi xong thì tạo Pull Request gộp ngược lại vào `develop`.

---

## 2. Quy ước đặt tên nhánh

Cú pháp bắt buộc:
```
<loại>/clab-<số ticket>-<mô tả ngắn gọn>
```

| Tiền tố | Mục đích sử dụng |
|:---|:---|
| `feature/` | Thêm chức năng / giao diện / API mới |
| `fix/` | Sửa lỗi hệ thống |
| `refactor/` | Tối ưu, dọn dẹp mã nguồn, không đổi logic |
| `docs/` | Bổ sung, chỉnh sửa tài liệu hướng dẫn |

**Ví dụ đúng chuẩn:**
- `feature/clab-122-dat-lich-kham`
- `feature/clab-123-quan-ly-user-admin`
- `fix/clab-135-loi-401-khi-refresh-token`

**Quy tắc:**
- Dùng chữ thường, ngăn cách bằng dấu gạch ngang `-`.
- **Tuyệt đối không dùng tiếng Việt có dấu, không dùng dấu cách khoảng trắng.**

---

## 3. Quy trình thực hiện chi tiết (Workflow)

### Bước 1: Luôn đồng bộ và tách nhánh từ `develop` mới nhất
```bash
git checkout develop
git pull origin develop
git checkout -b feature/clab-<ticket>-<mo-ta>
```

### Bước 2: Viết code, kiểm tra tính đúng đắn (Pre-flight checklist)
1. Kiểm tra Backend: `cd Source_code/backend && ./gradlew build` (hoặc test pass).
2. Kiểm tra Frontend: `cd Source_code/frontend && pnpm run build` (pass 0 lỗi).
3. `git status` sạch sẽ, không commit các file rác, file `.env`, mật khẩu thật hay token cá nhân.

### Bước 3: Đóng gói commit (Conventional Commits)
```bash
git add <file>
git commit -m "feat: <mô tả ngắn gọn việc đã làm>"
```

### Bước 4: Đẩy nhánh lên GitHub và tạo PR vào `develop`
```bash
git push -u origin feature/clab-<ticket>-<mo-ta>
```

Tạo Pull Request trên GitHub (hoặc bằng lệnh `gh pr create`):
```bash
gh pr create --base develop --head feature/clab-<ticket>-<mo-ta> --title "feat: <mô tả ngắn>" --body-file pr-body.md
```

---

## 4. Mẫu mô tả Pull Request (PR Description Template)

```markdown
## Tóm tắt
<!-- PR này giải quyết vấn đề gì? (1-3 câu) -->

## Thay đổi chính
<!-- Liệt kê các file và chức năng mới thêm/sửa -->
- 
- 

## Đã kiểm thử thế nào
<!-- Đã chạy build, test API hay thử trên giao diện thế nào -->
- [x] Chạy build Backend / Frontend thành công 0 lỗi.
- [x] Đã thử nghiệm luồng hoạt động thực tế.

## Ảnh hưởng tới người khác
<!-- Có sửa DB hay đổi API không? Nếu không, ghi: Không -->
Không

## Checklist
- [x] Tách nhánh và mở PR vào nhánh `develop` (KHÔNG phải `main`)
- [x] Tên nhánh đúng chuẩn `<loại>/clab-<ticket>-<mô tả>`
- [x] Không commit API Key / Secret / Passwords
```
