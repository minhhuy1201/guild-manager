# A — Một lượt đọc cho một danh tính

Ngày: 2026-09-06 · Phạm vi: `apps/api/src/modules/characters`, `auth`, `discord-bot`.
Tổng quan: [đợt 3](./2026-09-06-architecture-review-3-overview.md) · Mức: **Strong**

Yêu cầu gốc: cải thiện hiệu năng, không đổi behaviour business.

## Bối cảnh

### 1. Interface trả về ít hơn cái nó vừa đọc

`apps/api/src/modules/characters/characters.service.ts:152`

```ts
async findByDiscordId(
  discordId: string,
): Promise<{ id: string; role: GuildRole } | null> {
  const row = await this.prisma.character.findUnique({
    where: { discordId },
    select: { id: true, role: true },
  });

  return row === null ? null : { id: row.id, role: row.role as GuildRole };
}
```

`findUnique` theo một cột unique đã đọc trọn một hàng của Postgres; `select` chỉ cắt bớt lúc trả về.
Cái interface giấu đi không phải chi phí — nó chỉ giấu **dữ liệu người gọi đang cần**.

### 2. Nên bốn call site phải đi lượt thứ hai cho đúng hàng đó

| Call site | Lượt thứ hai | Chạy khi nào |
|---|---|---|
| `auth/auth.service.ts:245` `describeSession` | `characters.findById(member.id)` | mỗi `GET /auth/me`, mỗi lần refresh token, mỗi lần đăng nhập |
| `discord-bot/attendance-board.ts:344` `buildOwnBoard` | `characters.findById(resolved.characterId)` | mỗi `/diem-danh`, mỗi nút "Điểm danh ngay" |
| `discord-bot/attendance-board.ts:305` `handleAttendanceButton` | `characters.findById(pressed.characterId)` | mỗi lượt bấm nút Có/Không |
| `discord-bot/commands/diem-danh-ho.command.ts:59` | `findByDiscordId` rồi `findById`, **hai `await` nối đuôi** | mỗi `/diem-danh-ho` |

Ba trong bốn chỗ đi qua `ActorResolver.resolve` (`actor-resolver.ts:39`), nơi kết quả `{ id, role }`
được đóng thành `ResolvedActor`. `ResolvedActor.characterId` là chuỗi id — nên người gọi cầm được id
mà không cầm được hàng, và phải quay lại database lần nữa.

`describeSession` là chỗ đắt nhất: nó nằm trên mọi request có phiên.

### 3. `handleAttendanceButton` đã phải né bằng `Promise.all`

`attendance-board.ts:294`

```ts
// The character row is only needed for the heading, and `mark` never touches that table — so the
// read rides alongside the write instead of waiting for it.
const [, row] = await Promise.all([
  deps.attendance.mark({ ... }, resolved.actor),
  deps.characters.findById(pressed.characterId),
]);
```

Comment đó là bằng chứng: lượt đọc thứ hai đã được nhận ra là thừa thời gian, và cách chữa là giấu nó
sau một `Promise.all` chứ không phải bỏ nó đi. Nó vẫn là một round trip, chỉ là chạy song song.

## Quyết định

1. **`findByDiscordId` trả nguyên hàng**: `Promise<GuildMemberRow | null>`, đúng kiểu `findById` đang
   trả. Không thêm hàm mới, không giữ hai biến thể — một interface, một cách đọc "Discord ID → thành
   viên".
2. **`ResolvedActor` mang theo hàng thay vì mang id.** `characterId: string | null` đổi thành
   `character: GuildMemberRow | null`. Người gọi nào chỉ cần id thì đọc `character?.id`.
3. **Ba call site bỏ hẳn lượt `findById` đi kèm**; `diem-danh-ho.command.ts` bỏ luôn cặp `await` nối
   đuôi thành một lượt.
4. **`findById` giữ nguyên** — nó vẫn có người gọi thật (tra theo id, không theo Discord ID).

### Vì sao trả cả hàng chứ không thêm `findRowByDiscordId`

Hai hàm cùng đọc một bảng theo cùng một khoá, khác nhau ở chỗ cắt bớt cột, là hai interface cho một
việc — và người gọi phải học cả hai để chọn đúng. Một hàm sâu hơn hai hàm nông: `role` vẫn đọc được
từ hàng trả về, nên không ai mất gì.

## Ảnh hưởng contract

**Không có.** Không schema nào trong `packages/shared` đổi, không endpoint nào đổi hình dạng phản
hồi. `SessionUser` mà `describeSession` dựng ra vẫn y nguyên: nó vốn đã lấy `discordUsername`,
`discordAvatar` và `toCharacter(row)` từ chính hàng đầy đủ đó.

## Behaviour giữ nguyên

Ba nhánh dưới đây phải cho ra đúng kết quả cũ, và là chỗ dễ làm hỏng nhất:

- **Rescue admin không có `Character`.** `describeSession` với `member === null` nhưng
  `isRescueAdmin` đúng vẫn trả `role: ADMIN`, `character: null`. `resolveGuildRole({ isRescue,
  memberRole: member?.role ?? null })` đổi thành `... ?? null` đọc từ hàng, ý nghĩa không đổi.
- **Discord ID chưa gán cho ai.** `resolve` vẫn trả `null`, `NOT_LINKED` vẫn là câu trả lời.
- **`handleAttendanceButton` gặp hàng đã bị xoá.** Hiện tại `findById` trả `null` → `STALE_BUTTON`.
  Sau thay đổi, hàng được đọc từ `pressed.characterId` **vẫn phải đọc** — đây là nhân vật *được điểm
  danh hộ*, không phải người bấm, nên nó không nằm trong `ResolvedActor`. Lượt `Promise.all` ở đây
  **giữ nguyên**; A chỉ bỏ được lượt đọc ở ba chỗ kia.

Nói rõ điểm cuối vì nó cắt bớt lợi ích: đường bấm nút bớt được lượt đọc bên trong `resolve`, không
bớt được lượt đọc nhân vật đích.

## Rủi ro

`GuildMemberRow` là hàng `Character` đầy đủ, có `discordUsername`, `discordAvatar`, `lastLoginAt`.
`ActorResolver` sau thay đổi cầm dữ liệu định danh nhiều hơn trước. Không có gì rò ra ngoài — không
call site nào của nó dựng phản hồi HTTP từ `ResolvedActor` — nhưng đây là chỗ phải để mắt khi thêm
call site mới: `toCharacter` là hàm duy nhất được phép biến hàng đó thành thứ đi qua mạng, và nó đã
cố tình bỏ `discordAvatar` ra khỏi danh sách thành viên (`docs/architecture.md` §5).

## Đo lại

Bớt **một round trip đọc** ở: mỗi `GET /auth/me`, mỗi lần refresh, mỗi lần đăng nhập, mỗi `/diem-danh`,
mỗi nút "Điểm danh ngay", mỗi `/diem-danh-ho`. Không bớt được gì ở lượt bấm nút Có/Không (xem trên).
