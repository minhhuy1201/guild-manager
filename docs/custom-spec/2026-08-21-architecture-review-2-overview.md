# Rà soát kiến trúc đợt 2 (A1–A6, W1–W6) — Tổng quan

Ngày: 2026-08-21 · Phạm vi: toàn repo · Nguồn: rà soát `apps/api/src` (trừ `generated/`),
`apps/api/prisma`, `apps/web`, `packages/shared` ở commit `9820b5a`.

Mười hai cơ hội **làm sâu module** (deepening), kèm bằng chứng `file:line`. Mỗi mục có một spec
riêng trong cùng thư mục này.

Đợt trước: [C1–C7](./2026-08-18-architecture-review-overview.md) — **đã triển khai xong toàn bộ**.
Đợt này chỉ liệt kê friction **còn lại**, và không mục nào đảo lại quyết định của C1–C7.

Từ vựng dùng xuyên suốt (giống đợt 1): *module* (thứ có interface và implementation, ở mọi quy mô),
*interface* (mọi thứ người gọi phải biết để dùng đúng), *seam* (nơi interface nằm), *adapter* (thứ
cụ thể ngồi ở seam), *depth* (lượng hành vi trên một đơn vị interface), *leverage* (cái người gọi
được lợi), *locality* (cái người bảo trì được lợi).

## Bảng tóm tắt

### `apps/api`

| | Vấn đề | Mức | Spec |
|---|---|---|---|
| **A1** | `team-builder` gọi `listByWeek` chỉ để lấy side effect, rồi tự truy vấn bảng lịch 3 lần | Strong | [a1](./2026-08-21-a1-schedule-read-seam-design.md) |
| **A2** | `now: Date = new Date()` ở 15 chữ ký; một `POST /attendance` đánh giá luật quá hạn bằng hai đồng hồ | Strong | [a2](./2026-08-21-a2-clock-module-design.md) |
| **A3** | Codec response viết tay ở 5 chỗ; `Character` dựng ở 2 module với comment trùng từng chữ | Strong | [a3](./2026-08-21-a3-response-codec-design.md) |
| **A4** | `weekStart` là string trần: input hỏng → 500, lệch ngày → `[]` im lặng, so tuần bằng chuỗi | Strong | [a4](./2026-08-21-a4-week-start-design.md) |
| **A5** | Hai guard chép cùng một luật access-token; `common/` không có test nào | Worth exploring | [a5](./2026-08-21-a5-bearer-token-design.md) |
| **A6** | `GET /team-builder/weeks` chạy `deleteMany`; luật ô đội hình viết 3 lần theo 3 hình | Worth exploring | [a6](./2026-08-21-a6-formation-grid-codec-design.md) |

### `apps/web`

| | Vấn đề | Mức | Spec |
|---|---|---|---|
| **W1** | Giao thức "dialog gọi mutation" chép tay ở 4 dialog (20 mẩu lặp); 0 file `.test.tsx` | Strong | [w1](./2026-08-21-w1-mutation-dialog-design.md) |
| **W2** | Luật lọc roster 3 bản, bản ở màn Quản lý thành viên **đã lệch** (mất vế tìm theo ID) | Strong | [w2](./2026-08-21-w2-roster-filter-design.md) |
| **W3** | Gộp query dựng lại 4 lần; `use-formation-week` vứt message backend của 2/3 query và refetch thiếu | Strong | [w3](./2026-08-21-w3-query-group-design.md) |
| **W4** | Store bắt caller truyền `base`; ba người cùng ghi vào `drafts` | Worth exploring | [w4](./2026-08-21-w4-formation-draft-seam-design.md) |
| **W5** | Đồ thị invalidate cache nêu 3 lần; key factory lọt ra khỏi feature sở hữu | Worth exploring | [w5](./2026-08-21-w5-cache-graph-design.md) |
| **W6** | Nhận diện Guild War vẽ lại ở 4 màn, đã lệch cỡ icon một chỗ | Worth exploring | [w6](./2026-08-21-w6-session-label-design.md) |

**Ba mục vá lỗi thật, không chỉ dọn kiến trúc**: W3 (mất message tiếng Việt + nút thử lại không chạy),
W2 (không tìm được theo ID ở màn Quản lý thành viên), A4 (input hỏng thành 500).

## Thứ tự thực hiện

Hai nhánh **độc lập hoàn toàn** — có thể làm song song, hoặc chọn một nhánh làm trước.

```
apps/api:   A2 ──► A4 ──► A1 ──► A3 ──► A6
                                 A5  (độc lập, làm lúc nào cũng được)

apps/web:   W3 ──► W2 ──► W1 ──► W6
                          W4  ·  W5  (độc lập)
```

### Vì sao thứ tự đó ở backend

- **A2 trước tất cả.** Bốn spec còn lại đều thêm hoặc sửa chữ ký đang mang `now`. Làm A2 sau nghĩa
  là đặt chữ ký hai lần.
- **A4 trước A1.** Hai hàm public mới của A1 (`ensureWeekMaterialized`, `readWeekSessions`) nhận một
  mốc tuần — nên biết kiểu của nó trước khi đặt chữ ký.
- **A1 trước A3.** A1 bịt chỗ rò ở bảng `battleSession`; A3 làm đúng việc đó cho bảng `character`.
  Làm A1 trước để khuôn "một bảng, một chủ" đã có một tiền lệ.
- **A1 trước A6.** A1 dọn phần đọc lịch ra khỏi `team-builder.service.ts`; phần còn lại mới đủ nhỏ
  để tách rõ ba việc.
- **A5 độc lập** — chạm `common/` và `auth`, không giao với bốn spec kia.

### Vì sao thứ tự đó ở web

- **W3 trước.** Diff nhỏ nhất, vá một lỗi đang thấy được, và chạm cùng bốn màn mà W1/W2 sẽ chạm —
  đi trước thì mỗi màn chỉ bị mở ra sửa một lần cho phần trạng thái.
- **W2 sau W3.** Cũng vá một lỗi, cũng chạm ba trong bốn màn đó.
- **W1 sau W2.** Lớn hơn, và nó dựng hạ tầng test render (`@testing-library/react` + `jsdom`) —
  phần cần được duyệt trước khi làm.
- **W6 sau W1.** Nó là ứng viên đầu tiên đáng render-test, nên hưởng hạ tầng W1 dựng.
- **W4, W5 độc lập.** W4 chỉ trong `features/team-builder`; W5 chỉ chạm các hook mutation.

### Nếu chỉ làm được một việc

**A1.** Đây là chỗ duy nhất mà interface hiện tại nói dối: `listByWeek` được gọi để lấy side effect,
ràng buộc thứ tự chỉ sống trong một comment ở phía caller, và một endpoint mới quên dòng đó sẽ trả
về tuần thiếu Guild War — im lặng, không lỗi. Nó cũng rẻ: hai hàm thêm vào `.public.ts`, ba truy vấn
Prisma bỏ đi, và một mock nói dối trong spec biến mất.

Nếu ưu tiên là "người dùng thấy được ngay" thì đổi thành **W3** — hai lỗi thật, diff nhỏ nhất trong
cả mười hai mục.

## Những gì rà soát **không** tìm thấy vấn đề

Ghi lại để khỏi rà lại.

**Backend**

- `packages/shared/lib/vn-time.ts` — module sâu đúng nghĩa: 4 hàm export, invariant nêu rõ,
  `VN_OFFSET_MS` giữ private. C3 đã dọn xong.
- `session-schedule.ts` — hàm thuần, tất định, spec phủ ranh giới tuần / Guild War / nhãn /
  deadline. Module tốt nhất của backend.
- `config/env.validation.ts` + `config/cors.ts` — fail-fast, `cors.spec.ts` phủ cả nhánh preview;
  comment giải thích vì sao trả `false` thay vì ném.
- `characters.lib.ts` — nhỏ, thuần, có test, đúng chỗ.
- `infrastructure/prisma/prisma.service.ts` — mỏng có chủ đích, `createPool` ghi rõ lý do tồn tại.
- `src/__tests__/module-boundary.spec.ts` + `eslint-plugin-boundaries` — hàng rào có người kiểm.
  C5 đã xử lý.
- `prisma/load-env.ts` — ba nhánh, mỗi nhánh có lý do rõ.
- `auth.service.ts` — `timingSafeEqual` qua SHA-256 hai phía là đúng, đã có spec (C7 đã vá).

**Frontend**

- `lib/api-client.ts` — đúng một chỗ gọi `fetch`, bóc `{data}`, giữ message tiếng Việt; 65 dòng,
  interface một hàm, có test.
- `proxy.ts` + `features/auth/core` — C7 đã xong; hai `readAuthSecret`/`getAuthSecret` khác nhau
  **có chủ ý**, lý do đã ghi trong cả hai file. **Đừng hợp nhất.**
- `features/auth/core/index.ts` — seam chia theo *runtime* (Edge-safe) chứ không theo public/private,
  có comment giải thích.
- `features/team-builder/lib/` — không còn là bầy helper một-caller như C4 mô tả. Những module còn
  một caller (`active-match`, `session-status`, `week-status`, `active-session`) cô lập luật quyết
  định; deletion test nói độ phức tạp chỉ *chuyển chỗ* còn chi phí test thì tăng. **Không đụng.**
- `components/shared/` — không file nào đặt sai chỗ.
- Không store nào giữ server data; mọi cross-feature import đi qua `index.ts`.

**Điểm nhỏ, không đủ thành ứng viên**

- `prisma/fix-deadlines.ts` import thẳng `../src/modules/battle-sessions/session-schedule` — hợp lệ
  vì `prisma/**` được miễn lint và đây là script một lần; nhưng đổi tên file kia thì script gãy im
  lặng.
- `attendanceKeys.weeks()` không có call site nào (xem [W5](./2026-08-21-w5-cache-graph-design.md)).
