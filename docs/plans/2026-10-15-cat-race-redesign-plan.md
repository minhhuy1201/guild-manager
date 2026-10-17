# Đua mèo - Làm lại màn đua - Implementation Plan

> **Cho agent thực thi:** chạy inline theo `superpowers:executing-plans`. Model: Sonnet 5.5, medium
> effort. Bước dùng checkbox `- [ ]`.

**Mục tiêu:** Màn đua mèo rõ, to và minh bạch: mỗi mèo một làn, cùng vạch xuất phát, tên luôn hiện;
bảng xếp hạng live đủ mọi mèo bên phải; thời lượng nhập 10-40 giây; bậc giải có nhãn, icon, màu dễ
hiểu; bảng người thắng xuống dưới, mỗi hạng mục một khối.

**Kiến trúc:** Chỉ web + nhãn enum dùng chung. Kịch bản (`race-script.ts`) và bố cục làn
(`race-layout.ts`) vẫn là hàm thuần; `race-frame.ts` ghép hai thứ thành toạ độ từng khung hình;
`race-canvas.tsx` chỉ vẽ. Không đổi API, schema Zod, Prisma, Discord.

**Spec:** [`docs/specs/2026-10-15-cat-race-redesign.md`](../specs/2026-10-15-cat-race-redesign.md)
(mã R1-R8). Spec gốc [`2026-10-12-cat-race-design.md`](../specs/2026-10-12-cat-race-design.md)
giữ nguyên.

## Ràng buộc chung

- Nhánh `feat/cat-race-redesign`, tách từ `main`. Mỗi task một commit, message qua
  `caveman:caveman-commit`.
- Màu chỉ từ token (`.claude/rules/web/display.md`); canvas đọc token như `readPalette` hiện có.
- Chuyển cảnh chỉ `transform`/`opacity` với `--duration-*`; dòng bảng xếp hạng **không** animate khi
  đổi chỗ (`.claude/rules/web/interaction.md`).
- Kích thước control lấy từ `components/ui/`; dưới `sm` không control nào dưới 44px.
- Ngưỡng có tên, không số trần; không mutate; lồng ≤ 4 cấp.
- Sau khi sửa `packages/shared`: `pnpm --filter @guild/shared build`.
- Icon bậc giải là icon lucide (bộ icon app đang dùng). Icon vẽ màu `foreground` trên ô nền nhuộm màu
  bậc: `gold` (`oklch 0.7`) trên nền card gần trắng không đủ 3:1 cho đồ hoạ (WCAG 1.4.11), nên màu
  bậc nằm ở viền và nền, không nằm ở nét icon.

## Cấu trúc file

| File | Việc |
|---|---|
| `packages/shared/enums/prize-tier.enum.ts` | Nhãn Đặc biệt / Lớn / Thường (R4) |
| `apps/web/features/cat-race/lib/prize-tier-style.ts` | Class viền/nền mới cho `LOW`; thêm `PRIZE_TIER_ICON`, `PRIZE_TIER_OPTIONS`, `PRIZE_TIER_HINT` (R4, R5) |
| `apps/web/features/cat-race/components/prize-tier-badge.tsx` | **Mới.** Ô icon nhuộm màu bậc; dùng ở chip, khối người thắng, thẻ kết quả |
| `apps/web/features/cat-race/components/choice-buttons.tsx` | Option nhận `icon` tuỳ chọn |
| `.../create-cat-race-dialog.tsx`, `.../prize-form-dialog.tsx` | Ô "Độ quý của giải" + dòng giải thích; bỏ `TIER_OPTIONS` lặp lại |
| `apps/web/features/cat-race/lib/race-duration.ts` | **Mới.** `RACE_DURATION_MIN_SECONDS` 10, `MAX` 40, `DEFAULT` 12, `parseRaceDuration` (R3) |
| `apps/web/features/cat-race/store/race-store.ts` | `speed` → `durationSeconds`, khoá `localStorage` mới |
| `apps/web/features/cat-race/lib/race-script.ts` | Bỏ chung kết / loại dần; nhận `durationSeconds` (R1) |
| `apps/web/features/cat-race/lib/race-layout.ts` | Viết lại: bố cục làn ngang (R1, R2, R8) |
| `apps/web/features/cat-race/lib/race-frame.ts` | Viết lại: toạ độ mỗi mèo theo làn + tiến độ; `standingsAt` thay `leadersAt` |
| `apps/web/features/cat-race/lib/cat-label.ts` | **Mới.** Nhãn "Tên" / "Tên #n" (trước là `labelOf` trong canvas; giờ canvas và bảng xếp hạng cùng dùng) |
| `apps/web/features/cat-race/components/race-canvas.tsx` | Vẽ làn, cột tên, vạch, mèo; cuộn dọc; bỏ hướng dọc và bong bóng avatar |
| `apps/web/features/cat-race/components/race-standings.tsx` | **Mới.** Bảng xếp hạng live đủ mọi mèo (R6) |
| `apps/web/features/cat-race/components/race-stage.tsx` | Bố cục to: đường đua + bảng xếp hạng; ô thời lượng thay nút tốc độ |
| `apps/web/features/cat-race/components/winners-panel.tsx` | Lưới khối theo hạng mục (R7) |
| `apps/web/features/cat-race/components/prize-chips.tsx`, `race-result-overlay.tsx` | Thêm `PrizeTierBadge` |
| `apps/web/features/cat-race/components/cat-race-event-screen.tsx` | Màn đua full width, bảng người thắng xuống dưới, bỏ hiệu ứng trượt ra |

---

### Task 1: Bậc giải - nhãn, icon, màu (R4, R5)

- [x] Tạo nhánh `feat/cat-race-redesign` (`git rev-parse --abbrev-ref HEAD` trước).
- [x] `PRIZE_TIER_LABEL`: `HIGH` "Đặc biệt", `MEDIUM` "Lớn", `LOW` "Thường". Build shared.
- [x] `prize-tier-style.ts`:
  - `PRIZE_TIER_CLASS`: `HIGH` `border-gold bg-gold/15`, `MEDIUM` `border-jade bg-jade/10`, `LOW`
    `border-primary/50 bg-primary/5` (hết trùng card).
  - `PRIZE_TIER_ICON: Record<PrizeTier, LucideIcon>`: `Crown` / `Gem` / `Gift`.
  - `PRIZE_TIER_OPTIONS` (value, label, icon) dùng chung cho hai form.
  - `PRIZE_TIER_HINT`: "Chỉ đổi màu và icon hiển thị, không ảnh hưởng ai thắng."
- [x] `PrizeTierBadge` (`tier`, `size`): ô vuông bo góc nền nhuộm màu bậc, icon `foreground`,
  `aria-hidden` (nhãn bằng chữ luôn đi kèm ở nơi dùng).
- [x] `ChoiceButtons`: option có `icon?: LucideIcon`, vẽ trước nhãn.
- [x] Hai form: caption "Độ quý của giải" + `PRIZE_TIER_HINT` dạng `text-sm text-muted-foreground`;
  dùng `PRIZE_TIER_OPTIONS`.
- [x] `PrizeChips` và `RaceResultOverlay`: thêm `PrizeTierBadge` trước tên hạng mục.
- [x] Test: sửa `create-and-list.test.tsx:96`, `roster-and-prize.test.tsx:179` ("Thấp" → "Thường");
  thêm test chip hiện đúng nhãn cho icon bậc (qua tên hạng mục và hint trong form).
- [x] `pnpm --filter web test -- cat-race` xanh. Commit.

### Task 2: Thời lượng nhập bằng giây (R3)

- [x] `race-duration.ts`: hằng số có tên; `parseRaceDuration(raw: string): number | null` - chỉ số
  nguyên trong `[10, 40]`, còn lại `null`.
- [x] `race-store.ts`: `durationSeconds` + `setDurationSeconds`; khoá `cat-race-duration-seconds`;
  đọc lỗi / rỗng / không hợp lệ (gồm giá trị cũ của khoá `cat-race-speed`) → mặc định 12. Không đọc
  khoá cũ.
- [x] `race-script.ts`: `buildRaceScript` nhận `durationSeconds: number` thay `speed`; xoá `RaceSpeed`
  và `RACE_DURATION_SECONDS`.
- [x] `race-stage.tsx`: thay `ChoiceButtons` tốc độ bằng `FieldLabel` "Thời gian đua (giây)" +
  `Input type="number" min max step=1`. Giữ chuỗi gõ dở trong state cục bộ; hợp lệ thì ghi store;
  không hợp lệ thì dòng lỗi "Nhập số giây nguyên từ 10 đến 40." (khung `min-h-*` cố định) và khoá
  nút Đua. Khoá ô khi `stage !== "idle"`.
- [x] Test: `parseRaceDuration` (9, 10, 40, 41, 12.5, "", "abc"); store (đọc lại, giá trị rác, giá trị
  cũ `FAST`, `localStorage` ném lỗi); `race-stage` (đổi giây ghi store, ngoài khoảng khoá Đua và hiện
  lỗi) thay test "changes the speed".
- [x] Xanh. Commit.

### Task 3: Kịch bản không loại dần (R1)

- [x] `race-script.ts`:
  - Xoá `FINALIST_COUNT`, `FIRST_CHECKPOINT`, `SECOND_CHECKPOINT`, `cutAtFirstCheckpoint`,
    `finalistKeys`, `eliminates`.
  - Vai trò thời điểm về đích (bội số thời lượng của con thắng): một con á quân
    `[1.004, 1.012]`, `CHASER_COUNT = 3` con bám đuổi `[1.015, 1.07]`, còn lại trải rộng
    `[1.07, 1.6]` để đàn giãn ra rõ. Chọn á quân và bám đuổi ngẫu nhiên (đã có `shuffled`).
  - Giữ `MAX_WOBBLE`, `MAX_CYCLES` và công thức `progressAt` (đơn điệu đã chứng minh trong comment).
    Ghi thêm vào comment: con nào có `finishAt > durationSeconds` thì tại `durationSeconds` có tiến độ
    `< 1`, vì `s + 0.16·s(1-s) < 1` với mọi `s < 1`.
  - `RaceScript` thêm `endSeconds = durationSeconds + FINISH_HOLD_SECONDS` (chuyển hằng số từ
    `race-frame.ts`).
  - `rankAt(script, seconds)` kẹp `seconds` ở `durationSeconds`: sau khi con thắng chạm đích, thứ
    hạng đứng yên (spec mục 3 bước 4).
- [x] Test (`race-script.test.ts`, viết lại các ca loại dần): con thắng chạm đích đúng
  `durationSeconds` (10 và 40); tại `durationSeconds` mọi con khác `< 1`; không con nào chạy lùi
  (lấy mẫu 240 mèo, nhiều seed); mọi con có tiến độ 0 ở giây 0; `rankAt` sau đích bằng `rankAt` tại
  đích; một người một mèo ở chế độ Thường.
- [x] Xanh. Commit.

### Task 4: Bố cục làn và khung hình (R1, R2, R8)

- [x] `race-layout.ts` viết lại, chỉ hướng ngang:
  - Hằng số: `LANE_MIN_HEIGHT = 22`, `LANE_MAX_HEIGHT = 64`, `NAME_COLUMN_SHARE = 0.22`,
    `NAME_COLUMN_MIN = 96`, `NAME_COLUMN_MAX = 180`, `FINISH_MARGIN = 24` (px), `CAT_HEIGHT_SHARE = 0.75`.
  - `laneLayout(count, viewport: Area): LaneLayout` → `{ laneHeight, contentHeight, nameColumn,
    startX, finishX, catSize }`. `laneHeight` = `viewport.height / count` kẹp trong
    `[LANE_MIN_HEIGHT, LANE_MAX_HEIGHT]`; `contentHeight = count * laneHeight` (vượt viewport thì
    khung cuộn).
  - `laneCenterY(index, layout)`, `progressX(progress, layout)`: `startX + progress · (finishX - startX)`
    trừ nửa thân mèo, để mũi mèo chạm vạch đích đúng lúc tiến độ = 1.
- [x] `race-frame.ts` viết lại:
  - `planRace(script, viewport)` → `{ script, layout, laneOrder }`. Thứ tự làn: sắp theo nhãn
    `catLabel` bằng `localeCompare(..., "vi")` để người xem tự tìm tên mình (quyết định của plan,
    không đổi spec).
  - `frameAt(plan, seconds)` → mọi mèo `{ key, label, x, y }`; không còn `alpha`, `size` riêng,
    `labelled`.
  - `standingsAt(script, seconds)` = `rankAt` đầy đủ (thay `leadersAt`, bỏ `LEADER_COUNT`).
- [x] `cat-label.ts`: chuyển `labelOf` từ canvas, nhận `(cat, cats, byId)`; đổi tên thành `catLabel`.
- [x] Test (`race-layout.test.ts`, `race-frame.test.ts` viết lại): mọi mèo có `x` bằng nhau ở giây 0
  (cùng vạch); hai mèo cùng tiến độ có cùng `x`; `laneHeight >= 22` với 240 mèo trong khung 400px và
  `contentHeight = 240 * laneHeight`; số làn = số mèo, `y` không trùng; con thắng có `x` lớn nhất
  ở cuối; `standingsAt` đủ mọi khoá, con thắng đầu khi nhiều con cùng chạm đích; `catLabel` thêm `#n`
  chỉ khi một người có nhiều mèo.
- [x] Xanh. Commit.

### Task 5: Renderer canvas (R1, R2, spec 4.2)

- [x] `RaceCanvas` bọc canvas trong một `div` `h-full overflow-y-auto` có một div đệm cao
  `contentHeight`; canvas chỉ cao bằng khung nhìn, `sticky top-0`, và vẽ các làn đang thấy theo
  `scrollTop` (240 làn × 22px cao 5280px: một bitmap đủ chiều cao sẽ ngốn hàng trăm MB trên màn hình
  dpr cao). `ResizeObserver` theo `div` cuộn; kích thước đọc từ `clientWidth` / `clientHeight`.
- [x] Bỏ `VERTICAL_MAX_WIDTH`, `matchMedia`, `RaceOrientation`, bong bóng avatar (`discordAvatarUrl`,
  `AVATAR_SIZE_RATIO`). Avatar vẫn ở thẻ kết quả.
- [x] `readPalette` đọc thêm `--background`, `--muted`, `--muted-foreground`; font lấy từ
  `getComputedStyle(document.body).fontFamily` (Be Vietnam Pro).
- [x] Vẽ:
  - Nền đường đua `--background`; làn lẻ phủ `--foreground` ở độ mờ thấp (hằng số `LANE_STRIPE_ALPHA`).
  - Cột tên nền `--card`, tên `600` cỡ `NAME_FONT_PX = 14` (bằng `text-sm` sau root 115-120% thì
    đọc lại thực tế khi kiểm tra mắt), màu `--foreground`, cắt "…" bằng `measureText` (helper riêng
    trong file, < 20 dòng).
  - Chấm màu phái trước tên.
  - Vạch xuất phát liền nét `--foreground` 2px; vạch đích ca-rô `--foreground` / `--card`.
  - Mèo: sprite hiện có, cao `layout.catSize`.
  - Đếm ngược: chữ lớn `--foreground` trên một ô `--card` để nổi trên làn sọc.
- [x] `onLeaders` → `onStandings(keys)`, chu kỳ `STANDINGS_INTERVAL_MS = 250`; gửi lần cuối tại lúc
  kết thúc để bảng chốt đúng thứ hạng cuối.
- [x] Giữ `?fps`, skip, cleanup observer.
- [x] Test (`race-canvas.test.tsx`): đếm ngược; mọi tên được `fillText` (kể cả 240 mèo); `onStandings`
  nhận đủ khoá, con thắng đầu ở lần gọi cuối; skip gọi `onFinish` một lần; không còn nhánh dọc; đọc
  lại palette khi đổi theme.
- [x] Xanh. Commit.

### Task 6: Bố cục màn đua, bảng xếp hạng, bảng người thắng (R6, R7, spec 4.1, 4.3)

- [x] `RaceStandings` (`script`, `participants`, `keys`): `<ol>` cuộn trong khung, mỗi dòng: hạng
  (`tabular-nums`), chấm màu phái, `catLabel`. Top 3: hạng trên ô nền `primary`, chữ `font-semibold`.
  Trước khi đua: một dòng "Bảng xếp hạng hiện khi bắt đầu đua.".
- [x] `RaceStage`:
  - Khung trên: `grid lg:grid-cols-[minmax(0,1fr)_17rem]`; đường đua cao `h-[70dvh] min-h-96`;
    bảng xếp hạng cùng chiều cao từ `lg`, dưới `lg` nằm dưới, `max-h-80`.
  - Bảng xếp hạng giữ thứ hạng cuối trong `stage === "result"`; xoá khi bắt đầu vòng mới.
  - `RaceResultOverlay` chỉ phủ khung đường đua.
  - Hàng điều khiển dưới: ô thời lượng (Task 2), "Danh sách đua", "Người tham gia", nút Đua / Bỏ qua.
- [x] `CatRaceEventScreen`: bỏ lưới hai cột và `div` trượt ra; `RaceStage` rồi `WinnersPanel`
  xếp dọc.
- [x] `WinnersPanel`: `<h2>` giữ nguyên; các hạng mục thành lưới `grid gap-3 sm:grid-cols-2
  lg:grid-cols-3`; mỗi khối `rounded-xl border-2 p-3` + `PRIZE_TIER_CLASS[tier]`, đầu khối
  `PrizeTierBadge` + tên + `đã trao/số lượng` + nhãn bậc. Nội dung dòng người thắng, vòng huỷ, nút
  huỷ giữ nguyên.
- [x] Test: `race-stage.test.tsx` (bảng xếp hạng hiện đủ tên khi đua và giữ sau khi xong;
  overlay vẫn hiện); `winners-and-result.test.tsx` (khối có tên bậc; các ca cũ vẫn xanh);
  `cat-race-event-screen.test.tsx` (không còn class trượt ra).
- [x] Xanh. Commit.

### Task 7: Kiểm tra cuối

- [x] `pnpm --filter web lint`, `pnpm --filter web typecheck`, `pnpm --filter web test` (`pretest`
  tự build `@guild/shared`).
- [x] Chạy app local (`docs/development.md`, skill `run`): đợt Thường 2 và 20 người, đợt Vé đủ
  người × 3 vé. Mở `?fps`. Chụp màn hình sáng / tối, 360px và 1440px. Kiểm: cùng vạch xuất phát, đủ
  tên, bảng xếp hạng đủ và khớp vị trí, bậc giải phân biệt được, không cuộn ngang trang, khoảng 60fps
  với 240 mèo. Seed mẫu không đủ 80 người thì ghi rõ số đã thử.
- [ ] Review bằng `review-loop`; vòng cuối `pr-review` trong agent `reviewer`.
- [x] Spec, plan, code, test khớp nhau; spec đổi trạng thái "đã triển khai".

## Kết quả

Làm xong ngày 2026-10-15, nhánh `feat/cat-race-redesign`. Khác kế hoạch:

- Task 2 và 3 gộp chung commit với 4-5 vì `buildRaceScript` đổi chữ ký kéo theo cả layout, frame
  và canvas; không commit riêng nào biên dịch được nếu tách.
- Canvas chỉ cao bằng khung nhìn và vẽ theo `scrollTop` (xem Task 5), không cao bằng toàn bộ làn.
- `LANE_MAX_HEIGHT` 64 thay vì 48 để đợt ít người có mèo to hơn.
- Thứ tự làn sắp theo nhãn A-Z với số đọc như số (`localeCompare(..., "vi", { numeric: true })`).
- Kiểm tra bằng mắt: trang tạm (đã xoá) dựng `RaceStage` thật với dữ liệu giả trong Firefox
  headless ở 1440px và 390px, sáng và tối, 20 và 240 mèo, đang đua và ở thẻ kết quả. Đo thời gian
  thực với 240 mèo: khoảng 57 fps, trên Firefox headless vẽ bằng phần mềm nên là mức thấp. Chưa thử
  trình duyệt có GPU, chưa thử đợt đủ 80 người thật từ DB.
- Phát hiện khi kiểm tra: thẻ kết quả phủ lên chữ "N người / Hạng mục" của khung chờ (lỗi có sẵn
  từ trước). Đã sửa: khung chờ để trống khi đang ở màn kết quả.
