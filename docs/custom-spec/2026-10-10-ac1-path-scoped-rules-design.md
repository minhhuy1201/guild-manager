# AC1 - Luật nạp theo path

Ngày: 2026-10-10 · Trạng thái: **spec, chưa triển khai** · Tổng quan:
[`2026-10-10-agent-context-review-overview.md`](2026-10-10-agent-context-review-overview.md) · Phụ
thuộc: AC2 và AC3 merge trước

## 1. Vấn đề

- `CLAUDE.md:20-32` dặn đọc `architecture.md` (671 dòng, "binding"), `development.md`,
  `production.md` và `ci-triage.md` trước khi viết code.
- `apps/web/CLAUDE.md` dặn đọc `frontend.md` (1.092 dòng) "before creating or changing anything
  under `apps/web`".
- `apps/api/CLAUDE.md` dặn đọc `backend.md` (474 dòng).
- Agent cần vài dòng nhưng được dặn đọc cả nghìn dòng. Còn chưa đo agent thực sự đọc bao nhiêu
  [unknown]. Pilot sẽ đo.
- `.claude/rules/common/coding-style.md` và `security.md` không có `paths`, nên nạp mọi session.
  Nội dung là luật chung chung ("rate limit all endpoints", "CSRF protection on"), một phần trùng
  hoặc lệch với `CLAUDE.md`.

## 2. Mục tiêu

- Luật cho agent nằm trong `.claude/rules/<vùng>/*.md` có `paths`. Một rule nạp khi agent đọc hoặc
  sửa file khớp glob.
- Root `CLAUDE.md` chỉ giữ thứ đúng cho mọi task: stack, lệnh, secrets, shipping, convention chung.
  Mục "Read before writing code" đổi thành bảng tra "khi làm X, đọc mục Y".
- Mỗi luật chỉ có một chủ: rule file là bản gốc, doc cho người đọc thì link tới rule file, không chép
  lại.

## 3. Quyết định

| # | Câu hỏi | Quyết định đề xuất | Trạng thái |
|---|---|---|---|
| D1 | Ai là bản gốc của convention | Rule file. `frontend.md` §6 và `backend.md` giữ phần "vì sao" và sơ đồ, phần luật đổi thành link. | **mở**: cần user chốt |
| D2 | `rules/common/*` | Xoá `security.md`, vì nó là checklist chung chung và repo đã có Trivy và CodeQL. Từ `coding-style.md` giữ những gì repo thực sự theo, chuyển vào root `CLAUDE.md` hoặc rule có `paths`. Bỏ phần trùng với `~/.claude/CLAUDE.md`. | **mở** |
| D3 | `apps/*/CLAUDE.md` | Giữ, nhưng rút còn lệnh, stack và trỏ tới rule. Hai file này đã nạp theo yêu cầu, nên tác dụng giống rule có `paths=apps/web/**`. | đề xuất |
| D4 | Viết lại hay chuyển nguyên văn | Viết gọn, mệnh lệnh, mỗi luật một ý. Bỏ phần lịch sử và lý do dài, để chúng ở doc cho người. | đề xuất |
| D5 | Ngôn ngữ | Tiếng Anh, theo `CLAUDE.md`: comment, code và tên file bằng tiếng Anh. | đã có luật |

## 4. Cấu trúc đề xuất

```
.claude/rules/
├── web/
│   ├── data-flow.md     paths: apps/web/features/**, apps/web/hooks/**, apps/web/lib/**
│   ├── display.md       paths: apps/web/**/*.tsx            (frontend.md §6, nửa 1)
│   ├── interaction.md   paths: apps/web/**/*.tsx            (frontend.md §6, nửa 2)
│   └── routing.md       paths: apps/web/app/**, apps/web/proxy.ts, apps/web/config/routes.ts
├── api/
│   ├── module.md        paths: apps/api/src/modules/**
│   ├── discord.md       paths: apps/api/src/modules/discord-bot/**
│   └── config.md        paths: apps/api/src/config/**, apps/api/.env.example
├── shared.md            paths: packages/shared/**
└── prisma.md            paths: apps/api/prisma/**
```

Nguồn luật cho mỗi file lấy từ `apps/*/CLAUDE.md` (phần "rules that get broken first"),
`frontend.md` §4, §6, §9 và `backend.md`. Khi viết plan, đếm lại từng mục.

## 5. Chia PR

Mỗi PR một vùng, để diff (dòng xoá + dòng thêm) dưới 900.

| PR | Nội dung | Ước tính |
|---|---|---|
| AC1-a | Root `CLAUDE.md` (bảng tra), `rules/common`, `rules/web/data-flow.md`, `routing.md` | ~550 |
| AC1-b | `rules/web/display.md` từ `frontend.md` §6 dòng 372-~690 | ~500 |
| AC1-c | `rules/web/interaction.md` từ §6 dòng ~690-1008 | ~500 |
| AC1-d | `rules/api/*`, `shared.md`, `prisma.md` từ `backend.md` + `apps/api/CLAUDE.md` | ~750 |

## 6. Tiêu chí xong

- `/context` trong một session mới ở root cho thấy không còn rule nào nạp vô điều kiện, ngoài những
  gì D2 giữ lại.
- Đọc một file `apps/web/features/**/*.tsx` thì log của `InstructionsLoaded` có `data-flow.md` và
  `display.md`, không có rule api nào.
- Mỗi luật cũ trong `apps/*/CLAUDE.md` và `frontend.md` §9 có đúng một chỗ ở. Kiểm bằng một bảng đối
  chiếu trong PR.
- AC2 và AC3 vẫn xanh. Đây là lưới an toàn khi chữ rời khỏi context.

## 7. Rủi ro

- Rule chỉ nạp khi đọc hoặc sửa file khớp. Một task bắt đầu bằng việc tạo file mới ở thư mục mới có
  thể chưa nạp rule nào. Docs Claude Code nói Write cũng kích hoạt path rule, nhưng chưa kiểm thực
  tế [unknown]. Kiểm bằng log `InstructionsLoaded` trước khi merge AC1-a.
- Hai bản lệch nhau nếu D1 không chốt "một chủ".
