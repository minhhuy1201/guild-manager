# Màu đội và biểu tượng đội - thiết kế

Status: approved

Đi kèm [`2026-10-31-team-color-icon.md`](2026-10-31-team-color-icon.md). Bản này chốt hình dạng code:
bảng DB, hợp đồng shared, module phía web. Tên trong code là tiếng Anh, phần giải thích là tiếng Việt.

## Problem

Tên đội hiện có một luồng trọn vẹn: bảng `TeamName` (key là số đội, chỉ có dòng khi đội có tên), lock
`TeamNameVersion`, `GET/PUT /team-builder/team-names`, store draft `useTeamNameStore`, và
`useTeamNameDraft` lo Save và xung đột 412. Màu và biểu tượng phải đi đúng luồng này: chung lock,
chung Save, chung dialog xung đột. Ràng buộc:

- `getSavedFormation` trả `teamNames` cho Team notice. Caller này không được vỡ.
- Màu đang nằm ở 3 chỗ: `lib/team-color-group.ts` (đội → nhóm), `team-builder/lib/team-colors.ts`
  (nhóm → class), `tactics/lib/token-icon.ts` `TEAM_GROUP_HEX` (nhóm → hex). Đây là danh sách phải
  đồng bộ tay.
- `tokenBorderHex` là hàm đồng bộ, gọi sâu trong render Konva (`tactic-stage-view.tsx:240`, `:390`,
  `palette-drag-preview.tsx:81`). Hàm này không tự fetch được.
- Bảng mới phải có `ENABLE ROW LEVEL SECURITY` trong migration. `migration-rls.spec.ts` chặn CI nếu
  thiếu (`docs/production.md` §5).

## Usage (caller's view)

```ts
// packages/shared - one bundle, three parallel records, one version
import { TeamColor, TeamIcon } from "@guild/shared/enums";
import type { TeamSettingsState } from "@guild/shared/schemas";
const state: TeamSettingsState = {
  names: { "3": "Đội Công" },
  colors: { "3": TeamColor.RED },
  icons: { "3": TeamIcon.SWORDS },
  version: 7,
};

// apps/web - team column header
const color = resolveTeamColor(team, colors);          // TeamColor, chosen or default group
const style = TEAM_COLOR_STYLES[color];                 // { header, marker, hex }
<TeamStyleButton
  team={team} color={color} icon={icons[String(team)]}
  readOnly={readOnly}
  onColorChange={draft.setColor}                        // (team, TeamColor | null) => void
  onIconChange={draft.setIcon}                          // (team, TeamIcon | null) => void
/>

// apps/web - tactics map, inside render
const teamColors = useTeamColors();                     // {} while loading = default groups
stroke={tokenBorderHex(unit.token, teamColors)}
```

## Shape

### Dữ liệu (Prisma)

Ba bảng song song, mỗi bảng một record trên wire:

```prisma
model TeamName  { team Int @id  name  String    updatedAt DateTime @updatedAt }  // unchanged
model TeamColorChoice { team Int @id  color TeamColor  updatedAt DateTime @updatedAt }
model TeamIconChoice  { team Int @id  icon  TeamIcon   updatedAt DateTime @updatedAt }
enum TeamColor { JADE STONE NAVY GOLD RED PURPLE ORANGE SKY }
enum TeamIcon  { CASTLE SWORDS SHIELD FOOTPRINTS EYE TRUCK TOP_LANE MID_LANE BOT_LANE }
```

- `TeamNameVersion` giữ nguyên tên bảng và chỉ sửa comment: nó là lock của cả ba bảng. Nếu đổi tên
  bảng, Prisma sinh `DROP` + `CREATE`, nên phải viết tay migration. Không đáng làm.
- Mỗi bảng chỉ có dòng khi đội có giá trị, cùng luật "không có key" với tên. Không có cột nullable, nên
  không có dòng rỗng.
- Migration chỉ thêm bảng và enum, không phá dữ liệu. Có 2 dòng `ENABLE ROW LEVEL SECURITY`.

### Hợp đồng shared

```ts
// packages/shared/enums
export enum TeamColor { JADE = "JADE", STONE = "STONE", NAVY = "NAVY", GOLD = "GOLD",
  RED = "RED", PURPLE = "PURPLE", ORANGE = "ORANGE", SKY = "SKY" }
export enum TeamIcon { CASTLE = "CASTLE", SWORDS = "SWORDS", SHIELD = "SHIELD",
  FOOTPRINTS = "FOOTPRINTS", EYE = "EYE", TRUCK = "TRUCK",
  TOP_LANE = "TOP_LANE", MID_LANE = "MID_LANE", BOT_LANE = "BOT_LANE" }

// packages/shared/schemas/formation.schema.ts
const teamKeySchema = z.string().regex(/^(\d+)$/, "Số đội không hợp lệ.");
export const teamColorsSchema = z.record(teamKeySchema, z.enum(TeamColor));
export const teamIconsSchema = z.record(teamKeySchema, z.enum(TeamIcon));
export const teamSettingsSchema = z.object({
  names: teamNamesSchema, colors: teamColorsSchema, icons: teamIconsSchema,
});
export const saveTeamSettingsSchema = teamSettingsSchema.extend({ version: versionSchema });
export const teamSettingsStateSchema = teamSettingsSchema.extend({ version: z.number().int() });
export type TeamSettings / SaveTeamSettingsInput / TeamSettingsState / TeamColors / TeamIcons;
```

`TeamNames`, `teamNamesSchema` giữ nguyên. `TeamNamesState` và `SaveTeamNamesInput` bị xoá, thay bằng
bản `TeamSettings*`, không giữ hai cách làm một việc.

### API

- `TeamBuilderController` (guard `TEAM_BUILDER`): `GET` và `PUT /team-builder/team-settings` thay cho
  `team-names`. `saveTeamSettings` bump version một lần, rồi xoá và tạo lại cả ba bảng trong cùng
  transaction.
- `TeamColorsController` mới, cùng module, chỉ dùng `JwtAuthGuard`: `GET /team-builder/team-colors` →
  `TeamColors`. Đây là controller riêng, vì guard `TEAM_BUILDER` gắn ở cấp class.
- `getSavedFormation` vẫn trả `teamNames`. Team notice không đổi.

### Web

- `apps/web/lib/team-color.ts` thay `lib/team-color-group.ts`, `team-builder/lib/team-colors.ts` và
  `TEAM_GROUP_HEX`. Đây là danh sách duy nhất:
  - `TEAM_COLOR_STYLES: Record<TeamColor, { header; marker; hex }>`, class Tailwind viết đủ literal.
  - `resolveTeamColor(team, colors): TeamColor`, trả màu đã chọn hoặc nhóm mặc định. Số đội nằm ngoài
    bảng mặc định thì throw (misconfiguration fails loud).
  - Hiện chỗ fallback âm thầm là `DEFAULT_TEAM_COLORS`. Chỗ này bị bỏ.
- `team-builder/lib/team-icons.ts`: `TEAM_ICONS: Record<TeamIcon, { label; Icon: LucideIcon }>`. Đủ
  `Record` nên thiếu icon là lỗi compile.
- Store `useTeamNameStore` đổi thành `useTeamSettingsStore`, draft kiểu `TeamSettings`. Có
  `setName`, `setColor(saved, team, color | null)`, `setIcon(saved, team, icon | null)`. `null` xoá
  key. `useTeamNameDraft` đổi thành `useTeamSettingsDraft`. `countNameChanges` đổi thành
  `countSettingChanges`, đếm theo từng trường của từng đội.
- `TeamStyleButton` (component mới): nút chấm màu hoặc icon, mở `Popover` của shadcn có sẵn. Ở
  `readOnly`, component render ảnh tĩnh. `TeamColumn` nhận `color` và `icon` thay cho việc tự gọi
  `getTeamColors(team)`. `FormationGrid` và `FormationCaptureSheet` truyền `colors` và `icons` cạnh
  `names`, nên ảnh Discord nhận đủ mà không cần logic riêng.
- Tactics: `useTeamColors()` trong `features/tactics/hooks` gọi endpoint đọc. Trong lúc đang load,
  hook trả `{}`, nên map hiện màu nhóm mặc định như bây giờ. `tokenBorderHex(token, teamColors)` nhận
  thêm tham số.

Độ sâu interface: phía web chỉ lộ `resolveTeamColor` + `TEAM_COLOR_STYLES`. Màu mặc định theo số đội,
bảng class và bảng hex được giấu sau đó. Phía API, cách lưu trong ba bảng và lock được giấu sau một
cặp `get/saveTeamSettings`.

## Chosen candidate

Chọn **B: ba record song song + ba bảng song song**. Từ A chỉ lấy ý gộp một kiểu `TeamSettings` cho
draft và wire.

- **A**: một record theo đội `{ "3": { name?, color?, icon? } }` và một bảng `Team` với 3 cột nullable
  (đổi tên `TeamName`).
- **B**: giữ `names` y nguyên và thêm `colors`, `icons` cùng hình dạng. Mọi caller đọc `names[team]`
  (`teamLabel`, Team notice, ảnh capture) không đổi. Mỗi record có đúng một luật: có giá trị thì có
  key. A phải thêm luật "một object không được rỗng" và một migration đổi tên viết tay.

## Tradeoffs accepted

- Chấp nhận 3 bảng nhỏ thay cho 1, để đổi lấy migration chỉ thêm, không đổi tên và không có cột
  nullable.
- Chấp nhận tên bảng `TeamNameVersion` không còn khớp phạm vi, để đổi lấy việc không phải viết tay
  migration đổi tên. Comment trên model ghi rõ phạm vi.
- Chấp nhận đổi path `team-names` thành `team-settings` và đổi tên type, để đổi lấy tên nói đúng nội
  dung. Agent sau chép theo tên `TeamNamesState` sẽ không biết nó mang màu.
- Map chiến thuật hiện màu mặc định trong lúc chờ fetch. Đội đã đổi màu sẽ chớp màu cũ một lần khi mở
  map.

## Alternatives considered

- **A (record theo đội + bảng `Team`)**: một danh sách thay vì ba, nhưng mọi caller của `names` đều phải
  đổi. Nó còn cần migration đổi tên viết tay và luật object rỗng. Interface không sâu hơn, chỉ rộng hơn.
- **Chỉ thêm 2 cột vào `TeamName`**: `name` phải thành nullable, bảng tên là `TeamName` nhưng có dòng
  không có tên. Hiểu sai dễ hơn B.
- **Map gọi lại `GET team-settings`**: không cần endpoint mới, nhưng Member và Manager chỉ có `TACTICS`
  bị 403.

## Open questions and risks

- **Đổi path và type sang `team-settings`**: đã chốt là đổi, bỏ hẳn `team-names`, không giữ alias.
- **Cửa sổ deploy**: API và web deploy thành hai job riêng. Trong vài phút giữa hai lần deploy, một bên
  gọi path mà bên kia không còn hoặc chưa có. Web cũ trên API mới: `GET team-names` trả 404, nên tab
  đang mở hiện số đội thay cho tên và không sửa được header cho tới khi reload; `PUT` cũng 404. Web mới
  trên API cũ: lỗi tương tự với `team-settings`. Không mất dữ liệu, vì request lỗi không ghi gì. Reload
  sau khi cả hai deploy xong là hết. Chấp nhận, người duyệt PR xác nhận lại.
- **Màu xanh trời và navy**: ticket 01 đã kiểm tra bằng khoảng cách OKLab ở cả hai theme. `SKY` sáng
  hơn navy nhiều và lệch hue khoảng 45 độ, nên giữ `SKY`.

## Next implementation step

Viết enum `TeamColor`/`TeamIcon` + `teamSettings*` schema trong `packages/shared`, rồi test service
`saveTeamSettings` đỏ trước khi thêm bảng Prisma.
