# CẨM NANG TOÀN TẬP: CẤU TRÚC FRONTEND & QUY TRÌNH GIT CHUYÊN NGHIỆP
> **Dự án**: Quản Lý Văn Bản và Tài Liệu (QLVB&TL) — TLBM SYSTEM  
> **Áp dụng**: Toàn bộ thành viên phát triển Frontend & Quản lý Source Control Git  
> **Biên soạn**: Nhóm 1 (PM: Châu Tuấn Kiệt)

---

## MỤC LỤC
1. [Cấu Trúc Thư Mục Frontend Chuẩn Mực](#1-cấu-trúc-thư-mục-frontend-chuẩn-mực)
2. [Quy Tắc Quản Lý Mã Nguồn & Tránh File Rác](#2-quy-tắc-quản-lý-mã-nguồn--tránh-file-rác)
3. [Quy Trình Git Workflow Chuẩn Doanh Nghiệp (Issue -> PR)](#3-quy-trình-git-workflow-chuẩn-doanh-nghiệp)
4. [Bảng Tra Cứu Lệnh Git Thực Chiến (Cheatsheet)](#4-bảng-tra-cứu-lệnh-git-thực-chiến)
5. [Quy Chuẩn Viết Commit & Đặt Tên Nhánh (Conventional Commits)](#5-quy-chuẩn-commit--đặt-tên-nhánh)
6. [Bí Quyết Mở Pull Request (PR) Chuẩn - Dễ Duyệt](#6-bí-quyết-mở-pull-request-pr-chuẩn---dễ-duyệt)
7. [Checklist Kiểm Tra Bắt Buộc Trước Khi Push Code](#7-checklist-kiểm-tra-bắt-buộc-trước-khi-push-code)
8. [Kỹ Năng Xử Lý Xung Đột Git (Merge Conflict Resolution)](#8-kỹ-năng-xử-lý-xung-đột-git-merge-conflict-resolution)
9. [Quy Trình 4 Bước Tích Hợp Màn Hình Mới Vào App Shell](#9-quy-trình-4-bước-tích-hợp-màn-hình-mới-vào-app-shell)
10. [Quy Chuẩn Gọi API Kết Nối React Với Backend Django](#10-quy-chuẩn-gọi-api-kết-nối-react-với-backend-django)
11. [Kỹ Năng Cứu Nguy Với Git Stash (Cất Code Tạm Thời)](#11-kỹ-năng-cứu-nguy-với-git-stash-cất-code-tạm-thời)
12. [Quy Chuẩn Đồng Bộ Hệ Thống Đa Ngôn Ngữ (i18n)](#12-quy-chuẩn-đồng-bộ-hệ-thống-đa-ngôn-ngữ-i18n)
13. [Cấu Hình Deploy Vercel Chuẩn (Chống Lỗi 404 SPA Rewrite)](#13-cấu-hình-deploy-vercel-chuẩn-chống-lỗi-404-spa-rewrite)

---

## 1. Cấu Trúc Thư Mục Frontend Chuẩn Mực

Dự án sử dụng **React 18 + TypeScript + Vite**, áp dụng mô hình phân tách 3 tầng: **App Root (`app`)**, **Phân Hệ Nghiệp Vụ (`modules`)** và **Tài Nguyên Dùng Chung (`shared`)**.

```text
frontend/
├── public/                     # Tài nguyên tĩnh công khai (favicon.svg, icons.svg, fonts)
├── src/
│   ├── app/                    # 1. TẦNG KHỞI CHẠY HỆ THỐNG
│   │   ├── App.tsx             # Component gốc quản lý Layout, Theme, State toàn cục
│   │   ├── main.tsx            # Entry point gắn ứng dụng vào thẻ #root HTML
│   │   └── router.tsx          # Bộ điều phối ánh xạ Route ID sang View của từng nhóm
│   │
│   ├── modules/                # 2. TẦNG PHÂN HỆ NGHIỆP VỤ (CHIA THEO 8 NHÓM)
│   │   ├── auth/               # Nhóm 1: Đăng nhập, xác thực SSO, nhân vật hoạt họa
│   │   ├── dashboard/          # Nhóm 1: Bàn làm việc tổng hợp, 8 khối thống kê, sự kiện
│   │   ├── profile/            # Nhóm 1: Lý lịch cá nhân, đổi mật khẩu
│   │   ├── settings/           # Nhóm 1: Cài đặt giao diện, cấu hình thông báo, phím ảo
│   │   ├── documents/          # Nhóm 2: Văn bản đến, văn bản đi, văn bản mật
│   │   ├── records/            # Nhóm 3: Danh mục hồ sơ lưu trữ cấp 1 & cấp 2
│   │   ├── resources/          # Nhóm 4: Kho tài liệu và biểu mẫu hành chính dùng chung
│   │   ├── workflow/           # Nhóm 5: Quy trình trình ký điện tử, duyệt công văn
│   │   ├── tasks/              # Nhóm 6: Giao việc, giám sát tiến độ, hạn xử lý
│   │   ├── system/             # Nhóm 7: Phòng ban, nhân sự, phòng họp, sinh nhật
│   │   └── ai/                 # Nhóm 8: Trợ lý AI Assistant, chatbox tra cứu quy trình
│   │
│   └── shared/                 # 3. TẦNG TÀI NGUYÊN & THÀNH PHẦN DÙNG CHUNG
│       ├── components/         # Các UI components tái sử dụng
│       │   ├── Header/         # AppHeader, ThemeSelector, NotificationStreams, UserDropdown
│       │   ├── Layout/         # AppSidebar (truyền thống), AppFooter, MainLayout
│       │   ├── Navigation/     # MobileAssistiveTouch (phím ảo), TopSubNav
│       │   └── Syllabus/       # Giao diện chờ tích hợp các phân hệ đang phát triển
│       ├── locales/            # Hệ thống đa ngôn ngữ (i18n)
│       │   ├── vi.json         # Bản dịch Tiếng Việt chuẩn
│       │   ├── en.json         # Bản dịch Tiếng Anh chuẩn
│       │   └── i18n.ts         # Hook useTranslation() phản ứng tức thì không giật trang
│       ├── styles/             # Hệ thống CSS Design Tokens
│       │   ├── global.css      # Định nghĩa biến CSS (:root, [data-theme='light/dark'])
│       │   └── layout.css      # Khung App Shell, Sidebar, AssistiveTouch, Responsive
│       ├── types/              # Định nghĩa Interface TypeScript (navigation, theme, user)
│       └── utils/              # Hằng số hệ thống (constants.ts, danh mục modules)
│
├── .gitignore                  # Khai báo loại trừ file rác không đưa lên Git
├── index.html                  # HTML template gốc (đã cấu hình data-theme="light")
├── package.json                # Khai báo dependencies và script chạy
└── vite.config.ts              # Cấu hình Vite build và server port
```

### Cấu trúc nội bộ một Module (`src/modules/<ten-module>/`)
Khi từng nhóm bắt đầu code nghiệp vụ của mình, hãy tổ chức thư mục con bên trong theo chuẩn:
```text
modules/documents/
├── components/                 # Các component nhỏ (DocumentFilter, DocumentTable, StatusBadge)
├── pages/                      # Các trang hiển thị chính (IncomingDocsPage, OutgoingDocsPage)
├── services/                   # Hàm gọi API Backend Django (documentsApi.ts)
├── types/                      # Type & Interface dành riêng cho module (document.types.ts)
└── styles/                     # CSS riêng của module (nếu cần, ưu tiên dùng Design Tokens)
```

---

## 2. Quy Tắc Quản Lý Mã Nguồn & Tránh File Rác

### ❌ TUYỆT ĐỐI KHÔNG commit các mục sau lên Git:
1. **`node_modules/`**: Thư viện ngoài, cực nặng (hàng trăm MB).
2. **`dist/` / `build/`**: Thư mục sản phẩm sau khi build (chỉ sinh ra khi cần deploy).
3. **`skills/` / `.agents/`**: Thư mục kỹ năng AI nội bộ (chứa hàng trăm file dữ liệu, font, json nặng hơn 100k dòng).
4. **`.env` / `.env.local`**: Chứa mật khẩu, API key bí mật.
5. **`db.sqlite3`** (phía backend): Cơ sở dữ liệu cá nhân cục bộ.
6. **`__pycache__/` / `*.pyc`**: File cache biên dịch Python.

### ✅ Cấu hình file `.gitignore` chuẩn mực:
```gitignore
# Frontend & Dependencies
node_modules/
dist/
dist-ssr/
*.local
.npm/
.eslintcache
skills/
frontend/skills/
frontend/node_modules/
frontend/dist/

# Backend & Python
__pycache__/
*.py[cod]
*$py.class
*.sqlite3
backend/db.sqlite3
backend/**/__pycache__/
venv/
.venv/

# Environment & OS
.env
.env.local
.DS_Store
Thumbs.db
.vscode/
.idea/
```

---

## 3. Quy Trình Git Workflow Chuẩn Doanh Nghiệp

Quy trình chuẩn mực để không bao giờ bị "kêu trời vì ném 100k dòng":

```
[Issue trên GitHub] 
       │
       ▼
[Tạo nhánh con từ staging] (vd: feature/sidebar-style)
       │
       ▼
[Code & Test chạy mượt]
       │
       ▼
[Commit rõ ràng từng bước] (git commit -m "feat: ...")
       │
       ▼
[Push nhánh lên GitHub] (git push origin feature/sidebar-style)
       │
       ▼
[Mở Pull Request vào staging] + Kèm ảnh chụp giao diện
       │
       ▼
[Quang / Reviewer duyệt (Merge)] ➔ Xong task!
```

---

## 4. Bảng Tra Cứu Lệnh Git Thực Chiến

### A. Khởi đầu làm một công việc mới (Task mới)
```bash
# 1. Chuyển về nhánh staging và lấy code mới nhất của cả nhóm về
git checkout staging
git pull origin staging

# 2. Tạo một nhánh mới để làm việc (tách biệt hoàn toàn, không đụng ai)
git checkout -b feature/sua-mau-sidebar
```

### B. Trong quá trình làm việc
```bash
# 1. Kiểm tra xem mình đã sửa những file nào
git status

# 2. Xem chi tiết từng dòng code mình vừa sửa
git diff

# 3. Thêm các file đã sửa vào danh sách chuẩn bị lưu
git add src/modules/settings/pages/SettingsPage.tsx
# Hoặc thêm toàn bộ file đã chỉnh sửa:
git add .

# 4. Lưu lại với lời nhắn rõ ràng (Commit)
git commit -m "feat(settings): cap nhat phong cach thanh dieu huong truyen thong"
```

### C. Đẩy lên GitHub và tạo PR
```bash
# 1. Đẩy nhánh của mình lên GitHub (chỉ cần thêm -u ở lần đầu)
git push -u origin feature/sua-mau-sidebar

# 2. Lên trình duyệt truy cập link GitHub được hiển thị ở terminal để bấm tạo Pull Request
```

### D. Xử lý sự cố thường gặp
```bash
# Khi lỡ commit nhầm file rác / thư mục quá lớn (ví dụ folder skills):
git rm -r --cached frontend/skills
git commit -m "chore: remove accidental skills directory from git tracking"
git push origin <ten-nhanh-cua-ban>

# Hủy các thay đổi chưa commit trên 1 file để quay về trạng thái ban đầu:
git restore <duong-dan-file>

# Cập nhật code mới nhất từ staging vào nhánh của mình khi bị báo Out of Date:
git fetch origin
git merge origin/staging
```

---

## 5. Quy Chuẩn Commit & Đặt Tên Nhánh

### A. Đặt tên nhánh (Branch Naming)
* Tính năng mới: `feature/<ten-tinh-nang>` (Ví dụ: `feature/login-animation`, `feature/traditional-nav`)
* Sửa lỗi: `fix/<ten-loi>` (Ví dụ: `fix/header-clock-overflow`, `fix/mobile-footer-overlap`)
* Tối ưu / Dọn dẹp: `refactor/<noi-dung>` (Ví dụ: `refactor/clean-theme-tokens`)
* Tài liệu: `docs/<noi-dung>` (Ví dụ: `docs/update-readme-architecture`)

### B. Cấu trúc Commit Message (Chuẩn Conventional Commits)
Cú pháp: `loai(pham_vi): mo ta ngan gon ve thay doi`

| Loại commit | Khi nào sử dụng? | Ví dụ mẫu |
| :--- | :--- | :--- |
| **feat** | Thêm tính năng, màn hình, component mới | `feat(sidebar): them chuc nang accordion mo submenu` |
| **fix** | Sửa lỗi bug, sửa tràn chữ, lệch layout | `fix(login): sua loi lech mat nhan vat tren mobile` |
| **refactor** | Cải tổ code, dọn dẹp, tối ưu không đổi tính năng | `refactor(styles): thay the ma mau hardcode bang css tokens` |
| **style** | Chỉnh sửa giao diện, icon, khoảng cách margin/padding | `style(settings): doi icon facebook sang table-columns` |
| **docs** | Thêm hoặc sửa tài liệu README, hướng dẫn | `docs: dong bo toan bo file readme theo kien truc moi` |
| **chore** | Cập nhật cấu hình, .gitignore, dependencies | `chore: them skills vao gitignore va cap nhat package.json` |

---

## 6. Bí Quyết Mở Pull Request (PR) Chuẩn - Dễ Duyệt

Một PR khiến người review yêu thích và bấm Merge ngay trong 1 nốt nhạc:

1. **Atomic PR (PR nhỏ gọn)**:
   * Giữ số lượng file thay đổi dưới **15 files**.
   * Số dòng thay đổi lý tưởng từ **+50 đến +500 dòng** (tránh dồn hàng nghìn dòng).
2. **Tiêu đề rõ ràng**:
   * Chuẩn: `feat(layout): hoàn thiện thanh điều hướng truyền thống và accordion submenu`
   * Không nên: `update code`, `fix bug`, `xong roi`.
3. **Mô tả có kèm hình ảnh (Evidence Screenshots)**:
   * Chụp màn hình bằng phím `Windows + Shift + S` rồi bấm `Ctrl + V` dán thẳng vào ô mô tả của PR.
   * Reviewer chỉ cần nhìn ảnh là biết giao diện chạy đúng mà không cần mất công tải code về.
4. **Tag Reviewer**:
   * Gán đúng người phụ trách review tại mục **Reviewers** bên góc phải (ví dụ: `@domanhquang2006-ops`).

---

## 7. Checklist Kiểm Tra Bắt Buộc Trước Khi Push Code

Trước khi gõ lệnh `git push`, hãy tự chạy checklist 4 bước này:

- [ ] **1. Kiểm tra build thành công 100%**:
  Chạy lệnh tại thư mục `frontend`:
  ```bash
  npm run build
  # Hoặc: pnpm build
  ```
  *(Đảm bảo terminal báo `✓ built in ...` và code thoát với mã 0, không có bất kỳ lỗi TypeScript nào).*
- [ ] **2. Kiểm tra `git status`**:
  Xem lại có file rác nào (thư mục cache, file `.env`, file tải về tạm) bị dính vào danh sách chuẩn bị commit không.
- [ ] **3. Tuân thủ CSS Design Tokens**:
  Không tự tiện hardcode mã màu hex tĩnh (`#ff0000`, `#2563eb`) trong CSS/TSX. Luôn dùng biến `var(--bg-surface)`, `var(--text-main)`, `var(--color-primary)` để hỗ trợ mượt mà cả 2 chế độ Sáng & Tối.
- [ ] **4. Đảm bảo hỗ trợ Responsive**:
  F12 trên trình duyệt chuyển sang màn hình điện thoại (375px - 430px) kiểm tra không bị tràn thanh cuộn ngang và chữ không bị đè lên nhau.

---

## 8. Kỹ Năng Xử Lý Xung Đột Git (Merge Conflict Resolution)

Khi hai thành viên cùng sửa vào một file (ví dụ `router.tsx` hoặc `constants.ts`), khi gộp nhánh Git sẽ báo conflict và sinh ra các ký tự:

```text
<<<<<<< HEAD (Thay đổi hiện tại ở máy bạn)
import IncomingDocsPage from '../modules/documents/pages/IncomingDocsPage';
=======
import OutgoingDocsPage from '../modules/documents/pages/OutgoingDocsPage';
>>>>>>> staging (Thay đổi từ nhánh của bạn khác)
```

### 🛠️ Quy trình giải quyết conflict bằng VSCode / IDE:
1. Mở file bị báo đỏ (chữ **C** - Conflict) trong danh sách Source Control.
2. Ngay trên đoạn xung đột, VSCode sẽ hiện các nút bấm tiện ích:
   * **Accept Current Change**: Chỉ giữ lại code của bạn (xóa code bạn kia).
   * **Accept Incoming Change**: Chỉ nhận code của bạn kia (bỏ code của bạn).
   * **Accept Both Changes**: Giữ lại code của cả 2 bạn (Trường hợp cả 2 cùng import 2 trang khác nhau).
3. Sau khi bấm chọn, các ký tự `<<<<<<<`, `=======`, `>>>>>>>` sẽ tự biến mất.
4. Chạy lại `npm run build` để đảm bảo sau khi hợp nhất code vẫn biên dịch bình thường.
5. Thực hiện lưu kết quả giải quyết conflict:
   ```bash
   git add .
   git commit -m "fix(merge): resolve conflict with staging branch"
   git push origin <ten-nhanh-cua-ban>
   ```

---

## 9. Quy Trình 4 Bước Tích Hợp Màn Hình Mới Vào App Shell

Khi các nhóm (Nhóm 2, 3, 4, 5, 6, 7) hoàn thành một trang giao diện và muốn gắn vào khung App Shell của Nhóm 1:

### Bước 1: Tạo Component trang nghiệp vụ
Đặt trong thư mục: `src/modules/<ten-nhom>/pages/<TenTrang>.tsx`:
```tsx
import React from 'react';
import { ActivePageId } from '../../../shared/types/navigation';

interface Props {
  onNavigate: (page: ActivePageId) => void;
}

export default function IncomingDocsPage({ onNavigate }: Props) {
  return (
    <div className="module-page-container">
      <h2>Văn Bản Đến</h2>
      {/* Giao diện nghiệp vụ ở đây */}
    </div>
  );
}
```

### Bước 2: Khai báo Route ID trong Navigation Types
Mở file `src/shared/types/navigation.ts`, thêm ID của trang vào kiểu `ActivePageId`:
```typescript
export type ActivePageId =
  | 'dashboard'
  | 'documents_incoming'  // <-- Thêm ID trang mới ở đây
  | ...
```

### Bước 3: Đăng ký hiển thị trên thanh Sidebar
Mở file `src/shared/utils/constants.ts`, tìm mảng `NAVIGATION_MODULES`, khai báo item trong mục `subItems`:
```typescript
{
  id: 'documents_incoming',
  label: 'Văn Bản Đến',
  icon: 'fa-inbox',
  badge: 12,
  badgeColor: 'blue',
  description: 'Công văn, văn bản ngoài gửi đến đơn vị',
}
```

### Bước 4: Ánh xạ render trong Router
Mở file `src/app/router.tsx`, import trang và thêm một `case`:
```tsx
import IncomingDocsPage from '../modules/documents/pages/IncomingDocsPage';

// Trong switch (activePage):
case 'documents_incoming':
  return <IncomingDocsPage onNavigate={onNavigate} />;
```

---

## 10. Quy Chuẩn Gọi API Kết Nối React Với Backend Django

### A. Cấu hình Endpoint tập trung
Tạo file service gọi API trong `src/modules/<nhom>/services/<tenModule>Api.ts`:
```typescript
const BASE_API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

export interface DocumentItem {
  id: number;
  title: string;
  code: string;
  date: string;
}

export async function fetchIncomingDocuments(): Promise<DocumentItem[]> {
  try {
    const response = await fetch(`${BASE_API_URL}/documents/incoming/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${localStorage.getItem('token')}` // nếu có JWT
      },
    });

    if (!response.ok) {
      throw new Error(`Lỗi API: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Lỗi khi tải danh sách văn bản:', error);
    throw error;
  }
}
```

### B. Xử lý 3 trạng thái giao diện bắt buộc trên UI:
Trong React Component, **luôn luôn** phải xử lý 3 trạng thái:
1. **Loading**: Đang tải (hiện vòng quay hoặc khung xám Skeleton).
2. **Success**: Đã có dữ liệu (render bảng/danh sách).
3. **Empty / Error**: Không có dữ liệu hoặc mất mạng (hiện thông báo thân thiện kèm nút Thử lại).

```tsx
if (isLoading) return <div className="loading-spinner">Đang nạp dữ liệu từ Django...</div>;
if (error) return <div className="error-alert">Không thể kết nối Backend ({error})</div>;
if (data.length === 0) return <div className="empty-state">Chưa có văn bản nào trong hệ thống</div>;
```

---

## 11. Kỹ Năng Cứu Nguy Với Git Stash (Cất Code Tạm Thời)

**Tình huống:** Bạn đang code dở dang một trang, code chưa chạy được và chưa muốn commit, nhưng trưởng nhóm hoặc bạn Quang yêu cầu chuyển sang nhánh `staging` gấp để test hoặc sửa một lỗi khẩn cấp.

```bash
# 1. Cất toàn bộ code đang làm dở vào túi thần kỳ (Stash)
git stash save "dang lam do giao dien dashboard"

# Lúc này thư mục của bạn sạch bóng như lúc mới kéo về, thoải mái chuyển nhánh!
git checkout staging
git pull origin staging

# 2. Sau khi xong việc khẩn cấp, quay lại nhánh của mình
git checkout feature/dashboard-task

# 3. Lôi lại toàn bộ code dở dang ra làm tiếp bình thường
git stash pop
```

---

## 12. Quy Chuẩn Đồng Bộ Hệ Thống Đa Ngôn Ngữ (i18n)

Hệ thống đã hỗ trợ Song ngữ **Tiếng Việt (VN)** & **Tiếng Anh (EN)**. Để tránh việc đổi sang tiếng Anh bị lỗi giao diện:

### ❌ KHÔNG VIẾT CHỮ CỨNG:
```tsx
// Sai: Hardcode tiếng Việt trực tiếp
<button>Lưu Cài Đặt</button>
```

### ✅ SỬ DỤNG HOOK `useTranslation()`:
```tsx
import { useTranslation } from '../../../shared/locales/i18n';

export default function MyComponent() {
  const { t } = useTranslation();
  return <button>{t('settings.saveSettings')}</button>;
}
```

### ⚠️ QUY TẮC ĐỒNG BỘ JSON:
Khi bạn thêm một từ mới, **BẮT BUỘC** phải thêm vào cả 2 file:
* `src/shared/locales/vi.json`:
  ```json
  "saveSettings": "Lưu Cài Đặt"
  ```
* `src/shared/locales/en.json`:
  ```json
  "saveSettings": "Save Settings"
  ```

---

## 13. Cấu Hình Deploy Vercel Chuẩn (Chống Lỗi 404 SPA Rewrite)

Khi deploy ứng dụng React Single Page Application (SPA) lên Vercel, nếu người dùng truy cập trang con (như `/settings`) rồi nhấn **F5 (Reload)**, Vercel sẽ tìm file `settings.html` vật lý và báo lỗi `404: NOT_FOUND`.

### Cách khắc phục triệt để:
Tạo file `vercel.json` ngay trong thư mục `frontend/`:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
*Tác dụng:* Bắt buộc Vercel luôn luôn chuyển hướng mọi URL về file `index.html` để React Router tự điều phối trang, hoàn toàn không bị lỗi 404.

---
*Bản quyền © 2026 Nhóm 1 — Dự án QLVB&TL — Khoa CNTT Trường Cao Đẳng Công Nghệ Thông Tin TP.HCM (ITC).*
