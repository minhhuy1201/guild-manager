# C5 — Seam của module khai báo tường minh

Ngày: 2026-08-18 · Phạm vi: `apps/api`.
Bối cảnh chung: [tổng quan C1–C7](./2026-08-18-architecture-review-overview.md).
Độc lập, nhưng nhẹ đi đáng kể nếu làm **sau** [C1](./2026-08-18-c1-response-contract-design.md) (C1
đã xoá phần `export type` khỏi hai file `*.module.ts`).

Tách phần "public API" ra khỏi file `@Module`, và đổi luật ESLint từ đếm `../` sang một luật không
phụ thuộc độ sâu thư mục.

## Bối cảnh

### Vấn đề 1 — `*.module.ts` đang gánh hai vai

```ts
// apps/api/src/modules/battle-sessions/battle-sessions.module.ts:6-15
/**
 * Public API của module: module khác chỉ được import từ file này, không đụng
 * file nội bộ (luật no-restricted-imports trong eslint.config.mjs).
 */
export { BattleSessionsService } from './battle-sessions.service';
export { formatSessionLabel, isDeadlinePassed } from './session-schedule';
export type { BattleSessionEntity, WeekEntity } from './entities/battle-session.entity';

@Module({ … })
export class BattleSessionsModule {}
```

File `@Module` — vốn chỉ để khai metadata DI cho Nest — đã kiêm luôn vai **barrel**. Đúng thứ
`apps/api/docs/backend.md` §8 cấm:

> ⚠️ Do not add barrels inside `modules/` — với NestJS DI chúng là cách đáng tin cậy để tạo import
> vòng.

`characters.module.ts:10` cũng vậy (`export type { MemberEntity }`). Hai module thật đã phụ thuộc cơ
chế này: `attendance.service.ts:11-14` và `team-builder.service.ts:9-12` đều import
`BattleSessionsService` **kèm một hàm thuần** qua file module.

Nghịch lý ở chỗ chính luật ESLint đã đẻ ra thứ mà tài liệu cấm: muốn dùng một hàm thuần của module
bên cạnh thì chỗ hợp lệ duy nhất để nó đi qua là file `*.module.ts`.

### Vấn đề 2 — luật ESLint khoá cứng theo độ sâu thư mục

```js
// eslint.config.mjs:74-91
function moduleBoundaryRules() {
  return [
    restrictModuleInternals(['src/*.ts'],                  '\\./modules/'),
    restrictModuleInternals(['src/modules/*/*.ts'],        '\\.\\./'),
    restrictModuleInternals(['src/modules/*/*/*.ts'],      '\\.\\./\\.\\./'),
    restrictModuleInternals(['src/infrastructure/*/*.ts'], '\\.\\./\\.\\./modules/'),
  ];
}
```

Luật khớp trên **chuỗi import tương đối**, mà một chuỗi tương đối chỉ có nghĩa khi biết file đang
đứng ở đâu: từ `modules/auth/auth.service.ts` thì `../health/x` là module anh em; từ
`modules/auth/dto/x.ts` thì cùng chuỗi ấy lại là chính module mình. Nên phải khai **một block cho
mỗi độ sâu có thật**.

Hệ quả đã được chính tài liệu in đậm (`backend.md` §4):

> **Add a new depth and you must add a block**, or imports at that depth go unchecked.

Thêm `modules/attendance/mappers/` là luật **im lặng ngừng kiểm tra** ở cấp đó — không lỗi, không
cảnh báo, chỉ là một hàng rào biến mất. Kiểu hỏng tệ nhất: hỏng mà không ai biết.

Nguyên nhân gốc là dùng công cụ sai việc: `no-restricted-imports` so khớp **chuỗi**, trong khi câu
hỏi cần trả lời là về **đường dẫn đã resolve**.

## Quyết định thiết kế

### 1. `<domain>.public.ts` là seam, `*.module.ts` quay về đúng vai DI

```
modules/battle-sessions/
├── battle-sessions.public.ts     # ⭐ interface — thứ duy nhất module khác được import
├── battle-sessions.module.ts     # chỉ còn @Module
├── battle-sessions.controller.ts
├── battle-sessions.service.ts
└── session-schedule.ts
```

`battle-sessions.public.ts` re-export `BattleSessionsService`, `formatSessionLabel`,
`isDeadlinePassed`. `battle-sessions.module.ts` chỉ còn `@Module({ … })`.

`AttendanceModule` vẫn `imports: [BattleSessionsModule]` — đó là quan hệ DI, nhập từ file module là
đúng. Cái đổi là **code** (`attendance.service.ts`) nhập từ `.public`.

Lo ngại "barrel gây import vòng DI" ở `backend.md` §8 vẫn đúng và spec này không xoá nó, chỉ khu trú
lại: cấm barrel `index.ts` gom cả module; **một** file `.public.ts` mỗi module, chỉ re-export, không
import ngược lên module khác. Nếu hai file `.public.ts` cần nhau thì đó là cycle nghiệp vụ thật —
luật "không `forwardRef()`, tách module thứ ba" áp dụng.

### 2. Luật ESLint dựa trên đường dẫn đã resolve, không phải chuỗi

Đây là phần cần **thử nghiệm trước khi cam kết**, và là câu hỏi mở lớn nhất của spec này.

Hai hướng, theo thứ tự ưu tiên:

**(a) `eslint-plugin-boundaries`.** Khai `modules/*` là một loại phần tử, đặt luật "phần tử loại
`module` chỉ được import phần tử loại `module` qua file `*.public.ts`". Plugin này sinh ra đúng cho
bài toán này và biết khái niệm "cùng phần tử hay khác phần tử" — tức là phân biệt được import nội bộ
với import xuyên module, thứ mà so khớp chuỗi không làm được. Một luật, không phụ thuộc độ sâu.

**(b) `import/no-restricted-paths` của `eslint-plugin-import`.** Khớp trên đường dẫn đã resolve nên
cũng không phụ thuộc độ sâu, nhưng khai "cùng module thì được, khác module thì không" bằng
`zones`/`except` cần dựng cẩn thận — có khả năng phải sinh một zone cho mỗi module.

Cả hai đều là thêm dependency. `CLAUDE.md` cho phép khi *"nó thật sự bỏ đi được code mình phải tự
viết và tự test"* — ở đây là 4 block cấu hình sinh bằng tay cộng một đoạn comment 7 dòng giải thích
vì sao `group` không dùng được (`eslint.config.mjs:13-19`).

**Nếu cả hai không khả thi**, phương án lùi: giữ `no-restricted-imports` nhưng đổi vế phải của luật —
cấm mọi import tương đối trỏ tới `modules/<tên khác>/` mà **không** kết thúc bằng `.public`. Vẫn phải
khai theo độ sâu, nhưng ít nhất sai sót trở nên dễ thấy hơn vì chỉ có một hình dạng đường dẫn hợp lệ.

### 3. Luật `common/`/`config/` không đổi

`restrictUpwardImports` (`eslint.config.mjs:74-91` phần dưới) cấm hẳn cả thư mục, mạnh hơn và không
gặp vấn đề nhập nhằng độ sâu theo cùng cách. Giữ nguyên, không đụng trong spec này.

### 4. Có kiểm tra tự động rằng luật vẫn còn hiệu lực

Điểm yếu thật sự hôm nay không phải luật sai, mà là **luật hỏng trong im lặng**. Dù chọn hướng nào,
thêm một test nhỏ khoá lại điều đó: một file cố tình vi phạm (trong `__tests__/fixtures/`, loại khỏi
`tsconfig.build.json`) mà `eslint` **phải** báo lỗi. Nếu ai đó thêm một cấp thư mục và luật ngừng áp
dụng, bài test này đỏ.

Đây là thứ đáng giá nhất trong spec, hơn cả việc đổi luật: một hàng rào không ai kiểm tra thì không
phải hàng rào.

## Thay đổi cụ thể

- Thêm `modules/battle-sessions/battle-sessions.public.ts` và
  `modules/characters/characters.public.ts` (hai module duy nhất đang export ra ngoài).
  Các module khác chưa cần — **không tạo sẵn**, theo đúng luật "thêm khi có caller thứ hai".
- `battle-sessions.module.ts`, `characters.module.ts` — xoá phần `export`.
- `attendance.service.ts:11-14`, `team-builder.service.ts:9-12` — đổi import sang `.public`.
- `eslint.config.mjs` — thay `moduleBoundaryRules()` theo §2.
- `apps/api/docs/backend.md` — §4 viết lại phần "Enforced by ESLint" (bỏ đoạn giải thích
  `regex` vs `group` nếu chuyển sang plugin), §8 làm rõ ngoại lệ `.public.ts`, §3 thêm file này vào
  sơ đồ "bên trong một module".
- `docs/architecture.md` §3.2 — sửa câu "A module may import another module's `*.module` file only".
- `apps/api/CLAUDE.md` — sửa gạch đầu dòng tương ứng.

## Edge case

- **`app.module.ts`** import các `*.module.ts` để đăng ký — đúng và phải tiếp tục được phép. Luật
  chỉ chặn import **code**, không chặn import class module.
- **Test của module khác.** `__tests__/` hiện nằm trong module và chỉ import nội bộ; không đổi.
- **`infrastructure/prisma`** không phải module nghiệp vụ và được import trực tiếp bởi service —
  giữ nguyên, luật chỉ nói về `modules/`.
- **`health.controller.ts` gọi thẳng `PrismaService`** (`:20,30`), tức module `health` không có
  service. Nó vi phạm luật "controller không đụng Prisma" ở `backend.md` §4.4 dù được `health.module.ts:5`
  giới thiệu là *"mẫu tham chiếu cho cấu trúc một module nghiệp vụ"*. Ngoài phạm vi spec này, nhưng
  đáng sửa hoặc đáng sửa lại câu comment — một mẫu tham chiếu vi phạm luật của chính nó thì dạy sai.

## Kiểm thử

- `pnpm --filter api lint` xanh sau khi đổi.
- Fixture vi phạm ở §4 phải làm `lint` đỏ; đây là bài test chính.
- `pnpm --filter api test` chạy lại không sửa gì — spec này không đụng hành vi lúc chạy.
- Thử tay: tạo `modules/attendance/mappers/x.ts` import `../../battle-sessions/battle-sessions.service`
  → phải bị chặn. Đây chính là kịch bản mà luật hiện tại **không** chặn.

## Ngoài phạm vi

- Chia nhỏ `battle-sessions.service.ts` (315 dòng) — `backend.md` §3 đặt ngưỡng ~300 dòng, nên nó
  đang ở ranh giới, nhưng đó là việc khác.
- `health` module không có service (xem Edge case).
- Đưa `.public.ts` sang `apps/web` — bên đó đã có `index.ts` mỗi feature và luật đang được tuân thủ,
  trừ `proxy.ts` ([C7](./2026-08-18-c7-session-module-design.md)).
