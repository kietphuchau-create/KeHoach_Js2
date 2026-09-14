# Quy Trình Git Của Nhóm — MedSched

> Theo hướng dẫn của thầy (14/09). Áp dụng cho tất cả thành viên.

## 1. Ba loại nhánh

```
main                    <- bản ổn định, để nộp/demo. CHỈ nhận PR từ develop.
  └── develop           <- nhánh trung tâm. Mọi người gộp việc vào đây.
        ├── feature/clab-101-dat-lich-kham        (Hiếu)
        ├── feature/clab-102-checkin-qr           (Nhi)
        ├── feature/clab-103-spring-ai-triage     (Tân)
        └── feature/clab-104-giao-dien-dat-lich   (Trang)
```

**Nguyên tắc quan trọng nhất: không ai commit thẳng vào `main` hay `develop`.**
Mọi thay đổi đều đi qua nhánh riêng rồi mở Pull Request.

Vì sao cần `develop`: `main` luôn giữ được bản chạy được để demo với thầy bất cứ
lúc nào. Code đang làm dở gộp vào `develop` trước, chạy ổn rồi mới đưa lên `main`.

## 2. Đặt tên nhánh

```
<loại>/clab-<số ticket>-<mô tả ngắn>
```

| Loại | Dùng khi | Ví dụ |
|:---|:---|:---|
| `feature/` | Thêm chức năng mới | `feature/clab-122-dat-lich-kham` |
| `fix/` | Sửa lỗi | `fix/clab-135-sai-ma-loi-409` |
| `refactor/` | Dọn code, không đổi hành vi | `refactor/clab-140-tach-service` |
| `docs/` | Chỉ sửa tài liệu | `docs/clab-150-cap-nhat-api-spec` |

Quy tắc: **chữ thường**, ngăn bằng dấu `-`, **không dấu tiếng Việt**, không dấu cách.

Sai: `feature/Đặt lịch khám`, `task 14/9`, `Nhi_Bn`
Đúng: `feature/clab-122-dat-lich-kham`

## 3. Quy trình làm một việc, từ đầu đến cuối

```bash
# B1. Lấy develop mới nhất rồi tách nhánh từ đó
git checkout develop
git pull
git checkout -b feature/clab-122-dat-lich-kham

# B2. Code... rồi commit
git status                          # xem mình sắp commit gì
git add Source_code/backend/...     # thêm đúng file, hạn chế "git add ."
git commit -m "feat: them API dat lich kham"

# B3. Đẩy lên GitHub
git push -u origin feature/clab-122-dat-lich-kham

# B4. Mở Pull Request vào develop (KHÔNG phải main)
gh pr create --base develop --title "feat: them API dat lich kham"
# hoặc mở link GitHub in ra sau khi push rồi bấm "Compare & pull request"

# B5. Có người review, duyệt xong thì bấm Merge trên GitHub

# B6. Sau khi merge, dọn dẹp
git checkout develop
git pull
git branch -d feature/clab-122-dat-lich-kham
```

## 4. Cập nhật develop vào nhánh đang làm

Làm vài ngày mà `develop` có người merge thêm code mới, nên đồng bộ để tránh
xung đột dồn về cuối:

```bash
git checkout develop
git pull
git checkout feature/clab-122-dat-lich-kham
git merge develop        # xử lý xung đột nếu có, rồi commit
```

## 5. Đưa develop lên main

Khi `develop` chạy ổn và muốn chốt một bản để nộp/demo:

```bash
gh pr create --base main --head develop --title "release: gop develop vao main"
```

## 6. Nên bật Branch Protection trên GitHub

Vào **Settings → Branches → Add rule**, áp cho cả `main` và `develop`:

- ✅ Require a pull request before merging (chặn push thẳng)
- ✅ Require approvals: 1 (phải có người review)
- ✅ Require branches to be up to date before merging

Làm vậy thì kể cả lỡ tay `git push` thẳng vào `main`, GitHub cũng chặn lại.

## 7. Quy ước tiêu đề commit và PR

Dùng tiền tố conventional commit:

| Tiền tố | Nghĩa |
|:---|:---|
| `feat:` | Thêm chức năng |
| `fix:` | Sửa lỗi |
| `refactor:` | Dọn code |
| `docs:` | Tài liệu |
| `chore:` | Việc lặt vặt (cấu hình, dọn file) |

## 8. Những lỗi hay gặp

| Tình huống | Cách xử lý |
|:---|:---|
| `Please commit your changes before you switch branches` | `git stash` (cất tạm) → đổi nhánh → `git stash pop` (lấy lại) |
| `refusing to merge unrelated histories` | Có người dựng lại repo. Lấy đúng bản GitHub: `git fetch origin && git checkout -B main origin/main` |
| Lỡ commit vào `develop` | `git reset --soft HEAD~1` → tạo nhánh mới → commit lại ở đó |
| Lỡ commit nhầm file secret | Báo nhóm ngay, đổi key đó, rồi mới xóa khỏi lịch sử |

## 9. Có skill cho AI

Thư mục `.claude/skills/create-github-pr/` mô tả đúng quy trình này cho AI đọc.
Khi nhờ Claude tạo nhánh hay mở PR, nó sẽ tự đặt tên nhánh đúng quy ước
`feature/clab-<ticket>-<mô tả>` và nhắm PR vào `develop`, không phải `main`.
