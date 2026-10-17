# AC1 - Luật nạp theo path

Ngày: 2026-10-10 · Trạng thái: **đã triển khai** (#187) · Tổng quan:
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
| D1 | Ai là bản gốc của convention | Rule file. `frontend.md` §6 và `backend.md` giữ phần "vì sao" và sơ đồ, phần luật đổi thành link. | **chốt** 2026-10-11 |
| D2 | `rules/common/*` | Xoá `security.md`, vì nó là checklist chung chung và repo đã có Trivy và CodeQL. Từ `coding-style.md` giữ những gì repo thực sự theo, chuyển vào root `CLAUDE.md` hoặc rule có `paths`. Bỏ phần trùng với `~/.claude/CLAUDE.md`. | **chốt** 2026-10-11: xoá cả hai file |
| D3 | `apps/*/CLAUDE.md` | Giữ, nhưng rút còn lệnh, stack và trỏ tới rule. Hai file này đã nạp theo yêu cầu, nên tác dụng giống rule có `paths=apps/web/**`. | đề xuất |
| D4 | Viết lại hay chuyển nguyên văn | Viết gọn, mệnh lệnh, mỗi luật một ý. Bỏ phần lịch sử và lý do dài, để chúng ở doc cho người. | đề xuất |
| D5 | Ngôn ngữ | Tiếng Anh, theo `CLAUDE.md`: comment, code và tên file bằng tiếng Anh. | đã có luật |

## 4. Cấu trúc đề xuất

```
.claude/rules/
├── web/
│   ├── components.md
│   ├── tests.md
│   ├── data-flow.md
│   ├── display.md
│   ├── interaction.md
│   └── routing.md
├── api/
│   ├── module.md
│   ├── discord.md
│   └── config.md
├── shared.md
└── prisma.md
```

Hai bảng đặt tên ở lại `apps/*/CLAUDE.md`. `paths` chính xác và bản đồ nguồn: xem plan. Nguồn luật cho mỗi file lấy từ `apps/*/CLAUDE.md` (phần "rules that get broken first"),
`frontend.md` §4, §6, §9 và `backend.md`. Khi viết plan, đếm lại từng mục.

## 5. Chia PR

Một PR. User bỏ giới hạn 900 dòng ngày 2026-10-11.

## 6. Tiêu chí xong

- `/context` trong một session mới ở root cho thấy không còn rule nào nạp vô điều kiện, ngoài những
  gì D2 giữ lại.
- Đọc một file `apps/web/features/**/*.tsx` thì log của `InstructionsLoaded` có `data-flow.md`,
  `display.md` và `interaction.md`, không có rule api nào.
- Mỗi luật cũ trong `apps/*/CLAUDE.md` và `frontend.md` §9 có đúng một chỗ ở. Kiểm bằng một bảng đối
  chiếu trong PR.
- AC2 và AC3 vẫn xanh. Đây là lưới an toàn khi chữ rời khỏi context.

### Bằng chứng probe (2026-10-11, hook `InstructionsLoaded`)

| Lượt | Hành động | Rule nạp (`path_glob_match`) |
|---|---|---|
| 1 | Read `apps/web/features/members/components/member-row.tsx` | `web/display`, `web/interaction`, `web/data-flow`, `web/components`; `apps/web/CLAUDE.md` (`nested_traversal`) |
| 2 | Read `apps/api/src/modules/discord-bot/commands/index.ts` | `api/module`, `api/discord`; `apps/api/CLAUDE.md` |
| 3 | Write `apps/web/features/zz-probe/probe.tsx` (file mới) | `web/display`, `web/interaction`, `web/data-flow` |

Cả ba lượt: chỉ `~/.claude/CLAUDE.md` và `CLAUDE.md` nạp với `session_start`, không rule nào trong `.claude/rules/`.

## 7. Rủi ro

- Rule chỉ nạp khi đọc hoặc sửa file khớp. Một task bắt đầu bằng việc tạo file mới ở thư mục mới có
  thể chưa nạp rule nào. Docs Claude Code: "A path-scoped rule loads when Claude uses the Read, Write, or Edit tool on a matching file." Đã kiểm 2026-10-11 (xem §6, lượt 3): Write file mới nạp rule khớp.
- Hai bản lệch nhau nếu D1 không chốt "một chủ".
