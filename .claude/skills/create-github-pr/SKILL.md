---
name: create-github-pr
description: Use when creating a branch or opening a GitHub pull request for the MedSched project. Enforces the team's Git Flow - develop as integration branch, feature/clab-<ticket>-<detail> naming, PR into develop (never into main), and the required PR description template.
---

# Create GitHub PR — MedSched

Quy trình Git của nhóm. **Không bao giờ commit thẳng vào `main` hay `develop`.**

## Mô hình nhánh (branch model)

```
main                    <- chỉ nhận PR từ develop. Bản chạy được, để nộp/demo.
  └── develop           <- nhánh trung tâm. Mọi feature gộp vào đây.
        ├── feature/clab-101-dat-lich-kham
        ├── feature/clab-102-checkin-qr
        └── fix/clab-103-sai-ma-loi-409
```

- `main`: bản ổn định. **Chỉ** nhận PR từ `develop`.
- `develop`: nhánh tích hợp, luôn là nơi lấy code mới nhất để bắt đầu việc mới.
- Nhánh làm việc: tách từ `develop`, gộp lại vào `develop` qua PR.

## Quy ước đặt tên nhánh

```
<loại>/clab-<số ticket>-<mô tả ngắn>
```

| Loại | Dùng khi |
|:---|:---|
| `feature/` | Thêm chức năng mới |
| `fix/` | Sửa lỗi |
| `refactor/` | Dọn code, không đổi hành vi |
| `docs/` | Chỉ sửa tài liệu |

Ví dụ đúng:
- `feature/clab-122-dat-lich-kham`
- `fix/clab-135-loi-401-khi-refresh-token`

Quy tắc: chữ thường, ngăn bằng dấu `-`, **không dấu tiếng Việt**, không dấu cách.
`<mô tả ngắn>` tối đa khoảng 5 từ, đủ để người khác đọc tên nhánh là hiểu đang làm gì.

## Trước khi mở PR (pre-flight)

1. Code build được: `cd Source_code/backend && ./gradlew build`
2. `git status` sạch, **không commit** file `.env`, API key, mật khẩu thật
3. Đã cập nhật `develop` mới nhất vào nhánh của mình để tránh xung đột khi merge
4. Nếu có đổi API: cập nhật `Source_code/api-spec/openapi.yaml` **trong cùng PR**

## Tiêu đề PR

Dùng tiền tố conventional commit + mô tả ngắn:

- `feat: them API dat lich kham`
- `fix: tra 409 khi slot da bi giu thay vi 401`
- `docs: bo sung API spec cho nhom Reception`

## Mẫu mô tả PR (copy nguyên khối này)

```markdown
## Tóm tắt
<!-- PR này làm gì? 1-3 câu. -->

## Thay đổi
<!-- Gạch đầu dòng các thay đổi chính. -->

## Đã kiểm thử thế nào
<!-- ./gradlew build, gọi thử API bằng curl/Postman, số test PASS... -->

## Ảnh hưởng tới người khác
<!-- Có đổi API/DB không? Ai cần cập nhật gì sau khi merge? Không có thì ghi "Không". -->

## Checklist
- [ ] Build chạy được (`./gradlew build`)
- [ ] Đã tự test luồng chính
- [ ] Không commit secret / API key
- [ ] Đã cập nhật API spec nếu có đổi API
- [ ] PR nhắm vào `develop` (KHÔNG phải `main`)
```

## Lệnh

```bash
# 1. Bắt đầu việc mới: luôn tách từ develop mới nhất
git checkout develop
git pull
git checkout -b feature/clab-<ticket>-<mo-ta>

# 2. Làm xong thì commit
git add <file cụ thể>
git commit -m "feat: mo ta ngan"

# 3. Đẩy lên và mở PR vào develop
git push -u origin feature/clab-<ticket>-<mo-ta>
gh pr create --base develop --head feature/clab-<ticket>-<mo-ta> \
  --title "feat: mo ta ngan" --body-file pr-body.md
```

Khi `develop` đã ổn định và muốn đưa lên `main`:

```bash
gh pr create --base main --head develop --title "release: gop develop vao main"
```

## Bắt buộc với mọi PR

1. Tên nhánh đúng quy ước `<loại>/clab-<ticket>-<mô tả>`
2. PR nhắm vào `develop`, không phải `main`
3. Tiêu đề có tiền tố (`feat:`, `fix:`, `docs:`...)
4. Mô tả có đủ Tóm tắt / Thay đổi / Đã kiểm thử thế nào
5. Build xanh, không có secret
6. Có ít nhất 1 người review trước khi merge

## Lưu ý khi AI tạo PR

- **Không** tự merge PR. Chỉ tạo PR rồi báo lại link cho người dùng.
- **Không** force push lên `develop` hay `main`.
- Nếu người dùng chưa cho số ticket, hỏi lại; đừng tự bịa số.
- Commit đứng tên người dùng, không thêm dòng đồng tác giả nào khác.
