# F14 - Chống ghi đè đội hình: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development hoặc
> superpowers:executing-plans để chạy plan theo từng task. Bước dùng checkbox (`- [ ]`).

**Mục tiêu:** Lưu đội hình một ngày hoặc map tên đội với version cũ thì bị từ chối (412). Web hiện
dialog `Tải bản mới nhất` / `Vẫn ghi đè` / `Đóng`. Server tự gỡ người khỏi đội hình cũng tăng version.

**Kiến trúc:** Cột `BattleSession.formationVersion` và bảng một dòng `TeamNameVersion`. Ghi có điều kiện
bằng `updateMany ... where version = expected` trong transaction hiện có. Web: nháp nhớ `baseVersion`
lúc được tạo, gửi nó khi lưu; 412 đặt cờ xung đột, dialog ở màn hình quyết định.

**Tech stack:** NestJS 11, Prisma 7 + Postgres, Zod (`@guild/shared`), Jest; Next.js 16, TanStack
Query, Zustand, shadcn (Base UI), Vitest.

**Spec:** [`../custom-spec/2026-10-05-f14-roster-optimistic-locking-design.md`](../custom-spec/2026-10-05-f14-roster-optimistic-locking-design.md)
- đọc spec trước, plan không lặp lại lý do.

## Ràng buộc chung

- PR riêng, không gộp F13 (spec §10). Branch `feat/f14-roster-optimistic-locking`. Mục tiêu ≤ 900 dòng;
  vượt thì dừng, hỏi người dùng (tách API / web thành hai PR xếp chồng).
- Code, comment, tên file tiếng Anh; UI và message lỗi tiếng Việt; dấu gạch là `-`.
- Mã version sai là **412** (`PreconditionFailedException`), không phải 409 (spec D5).
- `version` bắt buộc trong body, không mặc định.
- Chỉ `team-builder` ghi `formationVersion` (spec 4.1). Không sửa `battle-sessions`.
- Shape qua mạng chỉ khai báo trong `packages/shared`; sửa xong chạy `pnpm --filter @guild/shared build`.
- Migration tạo local bằng `pnpm --filter api prisma:migrate` (DB local, không bao giờ Supabase); có
  `ENABLE ROW LEVEL SECURITY` cho bảng mới.
- Mỗi commit: kiểm branch; message qua `caveman:caveman-commit`.
- Lệnh: `pnpm --filter api test -- <pattern>`, `pnpm --filter web test -- <pattern>`; trước khi xong
  `lint`, `typecheck`, `test` cho `api` và `web`.

## Review Focus

1. Refetch (focus tab) dưới nháp đang sửa **không** đổi `baseVersion` → lưu vẫn 412 nếu server đã đổi. - Task 5.
2. Version sai → transaction rollback, `formationMatch.deleteMany` không được gọi. - Task 3.
3. Ngày đã đánh + version cũ → 409 (khoá thắng), không 412. - Task 3.
4. Chỉ tên đội xung đột: đội hình vẫn lưu xong, dialog chỉ liệt kê tên đội. - Task 7.
5. `Vẫn ghi đè` gặp 412 lần nữa → dialog mở lại, nháp còn nguyên. - Task 6.

---

### Task 1: Contract dùng chung

**Files:**
- Modify: `packages/shared/schemas/formation.schema.ts`
- Test: `packages/shared` có test schema thì thêm ở đó; không thì kiểm qua DTO ở Task 3-4.

**Produces:**
- `sessionFormationSchema` thêm `version: z.number().int()`.
- `saveFormationSchema` = `{ matches, version: versionSchema }`.
- `teamNamesStateSchema` = `{ names: teamNamesSchema, version: z.number().int() }`, `type TeamNamesState`.
- `saveTeamNamesSchema` = `{ names, version: versionSchema }`.

- [ ] **Bước 1: code**

```ts
/**
 * The version a save was based on. Required, never defaulted: a body without it comes from a client
 * that predates the check, and saving it would be the silent overwrite this field exists to stop.
 */
const versionSchema = z.number().int().nonnegative();

export const saveFormationSchema = z.object({
  matches: z.array(matchSchema).min(1).max(2),
  version: versionSchema,
});

export const saveTeamNamesSchema = z.object({
  names: teamNamesSchema,
  version: versionSchema,
});

/** GET/PUT /team-builder/team-names answer: the map plus the version it is at. */
export const teamNamesStateSchema = z.object({
  names: teamNamesSchema,
  version: z.number().int(),
});

export type TeamNamesState = z.infer<typeof teamNamesStateSchema>;
```

  `sessionFormationSchema` thêm `/** Bumped by every save and by every server-side release (spec F14 4.3) */ version: z.number().int(),`.
- [ ] **Bước 2:** `pnpm --filter @guild/shared build`; `pnpm --filter api typecheck` và
  `pnpm --filter web typecheck` sẽ đỏ ở chỗ dùng - Task 3-6 sửa. Commit cùng Task 3 (contract một mình
  không xanh typecheck).

### Task 2: Schema + migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_formation_versions/migration.sql` (sinh bằng
  `prisma:migrate`, rồi sửa tay thêm `INSERT` + RLS)

- [ ] **Bước 1: schema**

```prisma
model BattleSession {
  // ...
  /// Optimistic lock of this day's formation (spec f14). Bumped by every formation save and by every
  /// server-side release of a member. Written ONLY by the team-builder module, inside its own
  /// transactions, although the row belongs to battle-sessions: the formation rows are deleted and
  /// recreated on each save and a day with no formation has none, so the day row is where the
  /// version can always live.
  formationVersion   Int       @default(0)
}

/// Optimistic lock of the global team name map (spec f14). Exactly one row, id = 1, inserted by the
/// migration. A missing row is a broken database and fails loudly - it is never recreated.
/// Not a column on TeamName: an empty map has no row to carry it.
model TeamNameVersion {
  id      Int @id @default(1)
  version Int @default(0)
}
```

- [ ] **Bước 2:** `pnpm --filter api prisma:migrate --name add_formation_versions` (DB local).
- [ ] **Bước 3: sửa tay migration.sql**, cuối file:

```sql
-- The one row the service reads and bumps; the service never creates it.
INSERT INTO "TeamNameVersion" ("id", "version") VALUES (1, 0);

-- Same two-layer lock-out as 20260925004158_enable_rls_on_tactics: no policy, RLS denies all.
ALTER TABLE "TeamNameVersion" ENABLE ROW LEVEL SECURITY;
```

- [ ] **Bước 4:** `pnpm --filter api prisma migrate reset --force` trên DB local rồi `db:seed` để chắc
  migration chạy sạch từ đầu; `pnpm --filter api test -- migration-rls` → PASS.
- [ ] **Bước 5:** commit (schema + migration).

### Task 3: API - version đội hình

**Files:**
- Modify: `apps/api/src/modules/team-builder/team-builder.service.ts`, `team-builder.controller.ts:59-63`
- Test: `apps/api/src/modules/team-builder/__tests__/team-builder.service.spec.ts`,
  `team-builder.controller.spec.ts`

**Consumes:** Task 1, Task 2.

**Produces:**
- `saveFormation(sessionId: string, input: SaveFormationInput): Promise<SessionFormation>` (đổi chữ ký:
  nhận cả body).
- `releaseCharacterFromSession` giữ chữ ký, thêm bump.
- Hằng `FORMATION_STALE`.

- [ ] **Bước 1: test đỏ.** Mock `tx` thêm `battleSession: { updateMany, update }`, `prisma.battleSession.findMany`.

```ts
describe('saveFormation - version', () => {
  it('đúng version: tăng 1 rồi mới ghi, trả version mới', async () => {
    tx.battleSession.updateMany.mockResolvedValue({ count: 1 });
    const result = await service.saveFormation('s1', { matches: [MATCH], version: 3 });
    expect(tx.battleSession.updateMany).toHaveBeenCalledWith({
      where: { id: 's1', formationVersion: 3 },
      data: { formationVersion: { increment: 1 } },
    });
    expect(result.version).toBe(4);
    // updateMany chạy trước deleteMany
    expect(tx.battleSession.updateMany.mock.invocationCallOrder[0])
      .toBeLessThan(tx.formationMatch.deleteMany.mock.invocationCallOrder[0]);
  });

  it('sai version: 412, không xoá gì', async () => {
    tx.battleSession.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.saveFormation('s1', { matches: [MATCH], version: 2 }))
      .rejects.toBeInstanceOf(PreconditionFailedException);
    expect(tx.formationMatch.deleteMany).not.toHaveBeenCalled();
  });

  it('trận đã đánh + sai version: 409, không chạm version', async () => {
    // clock sau dateTime
    await expect(service.saveFormation('s1', { matches: [MATCH], version: 0 }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(tx.battleSession.updateMany).not.toHaveBeenCalled();
  });
});

it('getFormations trả version của từng ngày', ...)   // prisma.battleSession.findMany → [{ id, formationVersion: 7 }]

describe('releaseCharacterFromSession - version', () => {
  it('gỡ ≥1 ô: tăng version qua client được truyền', ...)
    // client.battleSession.update({ where: { id }, data: { formationVersion: { increment: 1 } } })
  it('không gỡ ô nào: không tăng', ...)
  it('ngày đã đánh: không tăng', ...)
});
```

  Sửa các test `saveFormation` cũ sang body `{ matches, version: 0 }` với `updateMany` → `{ count: 1 }`.
- [ ] **Bước 2:** `pnpm --filter api test -- team-builder` → FAIL.
- [ ] **Bước 3: code**

```ts
/** A save based on a version someone else has already moved past. */
const FORMATION_STALE =
  'Đội hình ngày này vừa được lưu ở nơi khác (admin khác, hoặc có người báo vắng). Tải bản mới nhất hoặc ghi đè.';
```

  `saveFormation(sessionId, input)`: giữ nguyên 404 → 409 → 409 → purge; trong `$transaction`, dòng đầu:

```ts
// The version check and the bump are one statement: a concurrent save holding the same version
// waits on this row's lock, then sees the bumped value and matches nothing (READ COMMITTED
// re-evaluates the WHERE). Throwing here rolls the transaction back before anything is deleted.
const { count } = await tx.battleSession.updateMany({
  where: { id: sessionId, formationVersion: input.version },
  data: { formationVersion: { increment: 1 } },
});
if (count === 0) throw new PreconditionFailedException(FORMATION_STALE);
```

  `.catch` hiện có chỉ dịch FK violation, rethrow phần còn lại - 412 đi qua nguyên vẹn. Response thêm
  `version: input.version + 1`.

  `getFormations`: đọc version song song với matches:

```ts
const [matchesBySession, versions] = await Promise.all([
  this.loadMatchesBySession(ids),
  this.loadFormationVersions(ids),
]);
// ... version: versions.get(session.id) - always present: the ids come from the same rows
```

```ts
/**
 * Formation version of each battle day. Read here rather than added to `readWeekSessions` because
 * team-builder is the column's only reader and writer.
 */
private async loadFormationVersions(sessionIds: string[]): Promise<Map<string, number>> {
  const rows = await this.prisma.battleSession.findMany({
    where: { id: { in: sessionIds } },
    select: { id: true, formationVersion: true },
  });

  return new Map(rows.map((row) => [row.id, row.formationVersion]));
}
```

  Nếu `versions.get` trả `undefined` (ngày bị xoá giữa hai query) → ném `Error` nêu `sessionId`, không
  `?? 0` (fail loud).

  `releaseCharacterFromSession`, sau `cleared`:

```ts
const released = deleted.count + cleared.count;
// A stale draft saved after this would put the member back - the bump makes that save a conflict.
if (released > 0) {
  await client.battleSession.update({
    where: { id: session.id },
    data: { formationVersion: { increment: 1 } },
  });
}

return released;
```

  Controller: `return this.teamBuilder.saveFormation(sessionId, body);`. Cập nhật JSDoc `@throws`
  (thêm `PreconditionFailedException`).
- [ ] **Bước 4:** `pnpm --filter api test -- "team-builder|attendance|leave|characters"` → PASS (caller
  của `releaseCharacterFromSession` dùng mock client - thêm `battleSession.update` vào mock nếu đỏ).
- [ ] **Bước 5:** commit (gồm Task 1 contract).

### Task 4: API - version tên đội

**Files:**
- Modify: `team-builder.service.ts` (`getTeamNames`, `saveTeamNames`), `team-builder.controller.ts:72-84`
- Test: `__tests__/team-name.service.spec.ts`, `team-builder.controller.spec.ts`

**Produces:**
- `getTeamNames(): Promise<TeamNamesState>`
- `saveTeamNames(input: SaveTeamNamesInput): Promise<TeamNamesState>` (`SaveTeamNamesInput` =
  `z.infer<typeof saveTeamNamesSchema>`, export từ shared nếu chưa có)
- Hằng `TEAM_NAMES_STALE`.

- [ ] **Bước 1: test đỏ**

```ts
it('get trả names + version', async () => {
  prisma.teamNameVersion.findUniqueOrThrow.mockResolvedValue({ id: 1, version: 5 });
  await expect(service.getTeamNames()).resolves.toEqual({ names: {}, version: 5 });
});
it('save đúng version: bump rồi xoá-dựng lại, trả version + 1', ...)
it('save sai version: 412, không deleteMany', ...)
it('thiếu dòng TeamNameVersion: get ném', ...)   // findUniqueOrThrow reject
```

- [ ] **Bước 2: code**

```ts
const TEAM_NAMES_STALE = 'Tên đội vừa được admin khác lưu. Tải bản mới nhất hoặc ghi đè.';
/** Id of the one TeamNameVersion row - see the model's comment. */
const TEAM_NAME_VERSION_ID = 1;
```

  `getTeamNames`: `Promise.all([teamName.findMany(...), teamNameVersion.findUniqueOrThrow({ where: { id: TEAM_NAME_VERSION_ID } })])`,
  trả `verifyResponse(teamNamesStateSchema, { names, version } satisfies TeamNamesState)`.
  `saveTeamNames`: trong transaction, trước `deleteMany`:

```ts
const { count } = await tx.teamNameVersion.updateMany({
  where: { id: TEAM_NAME_VERSION_ID, version: input.version },
  data: { version: { increment: 1 } },
});
if (count === 0) throw new PreconditionFailedException(TEAM_NAMES_STALE);
```

  Ghi chú: thiếu dòng cũng ra `count === 0` → 412 thay vì 500 ở đường ghi; đường đọc (`findUniqueOrThrow`)
  đã lộ lỗi trước khi ai lưu được, nên chấp nhận.
- [ ] **Bước 3:** `pnpm --filter api test -- "team-name|team-builder.controller"` → PASS;
  `pnpm --filter api lint && pnpm --filter api typecheck` → xanh.
- [ ] **Bước 4:** commit.

### Task 5: Web - nháp nhớ `baseVersion`

**Files:**
- Modify: `apps/web/features/team-builder/store/formation-store.ts`, `store/team-name-store.ts`,
  `api/team-builder-api.ts`, `hooks/use-team-names.ts`, `hooks/use-formation-draft.ts`
  (`editActiveDraft`, `seedFrom`), `hooks/use-team-name-draft.ts`, `hooks/use-formation-screen.ts:97-98`
- Test: `store/__tests__/formation-store.test.ts`, `store/__tests__/team-name-store.test.ts`,
  `hooks/__tests__/render-formation-hook.ts` (seed thêm `baseVersions`, `teamNameBaseVersion`)

**Produces:**
- `formation-store`: `baseVersions: Record<string, number>`; `ensureDraft(sessionId, initial, baseVersion: number)`;
  `rebase(sessionId, version: number)`. `clearDraft`, `setWeek`, và `undo` về "không nháp" xoá
  `baseVersions[sessionId]`.
- `team-name-store`: `baseVersion: number | null`; `setName(saved: TeamNamesState, team, name)`;
  `rebase(version: number)`; `clearDraft` đặt cả hai về `null`.
- `fetchTeamNames(): Promise<TeamNamesState>`; `saveTeamNames(input: SaveTeamNamesInput): Promise<TeamNamesState>`;
  `SaveFormationArgs` thêm `version: number`.

Map song song thay vì đổi `drafts` sang `{ matches, baseVersion }`: `drafts` được đọc ở nhiều chỗ
(`matchesBySession`, undo, copy) - map riêng giữ diff nhỏ.

- [ ] **Bước 1: test đỏ (store)**

```ts
it('ensureDraft ghi baseVersion lần đầu, không đổi khi nháp đã có', () => {
  store.ensureDraft('s1', MATCHES, 3);
  store.ensureDraft('s1', MATCHES, 4);   // refetch dưới nháp
  expect(useFormationStore.getState().baseVersions.s1).toBe(3);
});
it('clearDraft xoá baseVersion', ...)
it('undo về không nháp xoá baseVersion', ...)
it('setWeek xoá mọi baseVersion', ...)
it('rebase đổi baseVersion, giữ nháp', ...)
// team-name-store
it('setName lần đầu lấy version từ saved, lần sau giữ', ...)
it('clearDraft đặt draft và baseVersion về null', ...)
```

- [ ] **Bước 2: code store**

```ts
ensureDraft: (sessionId, initial, baseVersion) =>
  set((state) =>
    state.drafts[sessionId]
      ? state
      : {
          drafts: { ...state.drafts, [sessionId]: initial },
          // Captured with the draft, never re-read at save time: a background refetch moves the
          // saved copy's version under the draft, and saving with that one defeats the lock.
          baseVersions: { ...state.baseVersions, [sessionId]: baseVersion },
        }
  ),
rebase: (sessionId, version) =>
  set((state) => ({ baseVersions: { ...state.baseVersions, [sessionId]: version } })),
```

  `clearDraft` và nhánh `else delete drafts[sessionId]` của `undo` cũng xoá `baseVersions[sessionId]`
  (bản sao mới, không mutate). `setWeek` đặt `baseVersions: {}`.
- [ ] **Bước 3: code nơi gọi.** `useFormationDraft`: tra version bản lưu của ngày đang mở

```ts
const savedVersion = sessions.find((s) => s.sessionId === activeSessionId)?.version;
```

  và truyền vào `ensureDraft(sessionId, matches, savedVersion)` trong `editActiveDraft` và `seedFrom`
  (cả hai đã `return` sớm khi không có `activeSessionId`; ngày đang mở luôn có trong `sessions`, nên nếu
  `savedVersion` là `undefined` thì ném `Error` - trạng thái không thể xảy ra, không đoán số).
  `useTeamNames` giữ nguyên; `useFormationScreen` truyền `teamNamesQuery.data ?? EMPTY_TEAM_NAMES_STATE`
  (`{ names: {}, version: 0 }`) - chỉ dùng trước khi query về, lúc đó chưa sửa được gì.
  `useTeamNameDraft(saved: TeamNamesState)`: `names = draft ?? saved.names`; `setName` truyền `saved`.
- [ ] **Bước 4:** `pnpm --filter web test -- "formation-store|team-name-store|use-formation-draft|use-team-name-draft"`
  → PASS; sửa fixture cũ thiếu `version` (thêm `version: 0` vào `SessionFormation` giả).
- [ ] **Bước 5:** commit.

### Task 6: Web - lưu với version, cờ xung đột, hai lối thoát

**Files:**
- Modify: `hooks/use-formation-draft.ts` (`handleSave`, state trả về), `hooks/use-team-name-draft.ts`
  (`save`), `hooks/use-formation-week.ts` (thêm `fetchFormationVersion`), `hooks/use-formation-screen.ts`
- Test: `hooks/__tests__/use-formation-draft.test.ts`, `hooks/__tests__/use-team-name-draft.test.ts`

**Produces** (thêm vào `FormationDraftState` và `TeamNameDraftState`):
- `isStale: boolean` - lần lưu gần nhất bị 412, nháp còn nguyên.
- `discardStale(): void` - xoá nháp, tắt cờ, refetch.
- `overwriteStale(): Promise<void>` - lấy version mới nhất, `rebase`, lưu lại.
- `dismissStale(): void` - tắt cờ, giữ nháp (nút `Đóng`); test `dismissStale giữ nháp, isStale = false`.
- `FormationWeekState.fetchFormationVersion(sessionId: string): Promise<number>`.

- [ ] **Bước 1: test đỏ**

```ts
it('lưu gửi baseVersion, không phải version của bản refetch', async () => {
  // seed baseVersions.s1 = 3; sessions có version 5
  await act(() => result.current.handleSave());
  expect(saveFormation).toHaveBeenCalledWith(expect.objectContaining({ version: 3 }));
});
it('412: isStale = true, nháp còn, không refetch kiểu khoá', ...)
it('409: hành vi cũ (refetchFormations), isStale = false', ...)
it('discardStale: xoá nháp, isStale = false', ...)
it('overwriteStale: rebase lên version mới nhất rồi lưu với nó', async () => {
  fetchFormationVersion.mockResolvedValue(6);
  await act(() => result.current.overwriteStale());
  expect(saveFormation).toHaveBeenLastCalledWith(expect.objectContaining({ version: 6 }));
});
it('overwriteStale gặp 412 lần nữa: isStale vẫn true, nháp còn', ...)
// use-team-name-draft: bốn ca tương ứng, overwrite đọc version qua refetch của useTeamNames
```

- [ ] **Bước 2: code**

```ts
/** HTTP status the backend returns when the draft's base version is no longer current. */
const STALE_STATUS = 412;
```

  `handleSave`: body `{ sessionId, matches: toWireMatches(matches), version: baseVersions[sessionId] ?? savedVersion }`
  - `baseVersions` thiếu chỉ khi ngày chưa có nháp, mà khi đó nút Lưu không hiện (ngày sạch); dùng
  `savedVersion` cho đủ kiểu và comment điều đó. Nhánh `catch`:

```ts
if (error instanceof ApiError && error.statusCode === STALE_STATUS) {
  setStaleSessionId(sessionId);   // useState<string | null>
  return;
}
```

  `isStale = staleSessionId === activeSessionId`. Lưu thành công thì `setStaleSessionId(null)`.
  `saveErrorMessage` bỏ qua lỗi 412 (dialog nói thay, tránh hai thông báo).

```ts
async function overwriteStale() {
  if (!activeSessionId) return;
  const latest = await fetchFormationVersion(activeSessionId);
  rebase(activeSessionId, latest);
  await handleSave();   // 412 again sets the flag again - the dialog stays open
}

function discardStale() {
  if (!activeSessionId) return;
  clearDraft(activeSessionId);
  setStaleSessionId(null);
  refetchFormations();
}
```

  `useFormationDraft` nhận thêm tham số `fetchFormationVersion`. Trong `use-formation-week.ts`:

```ts
fetchFormationVersion: async (sessionId) => {
  const { data } = await formationsQuery.refetch();
  const version = data?.find((session) => session.sessionId === sessionId)?.version;
  // The day was open a moment ago; gone now means it was deleted - say so instead of guessing.
  if (version === undefined) throw new Error("Ngày đánh này không còn tồn tại, hãy tải lại trang.");
  return version;
},
```

  `useTeamNameDraft`: cùng mẫu, `isStale` là `useState<boolean>`; `overwriteStale` dùng
  `(await refetch()).data.version` - hook nhận thêm `refetch` từ `useTeamNames()` qua `useFormationScreen`.
- [ ] **Bước 3:** `pnpm --filter web test -- "use-formation-draft|use-team-name-draft|use-formation-week"` → PASS.
- [ ] **Bước 4:** commit.

### Task 7: Web - dialog xung đột

**Files:**
- Create: `apps/web/features/team-builder/components/save-conflict-dialog.tsx`
- Modify: `components/team-builder-screen.tsx` (render dialog)
- Test: Create `components/__tests__/save-conflict-dialog.test.tsx`

**Consumes:** `isStale`, `discardStale`, `overwriteStale` của cả hai draft (Task 6); `MutationDialogShell`
từ `@/components/shared/mutation-dialog`.

**Produces:** `SaveConflictDialog({ formationLabel, isFormationStale, isTeamNamesStale, onReload, onOverwrite, onClose })`.

- [ ] **Bước 1: test đỏ**

```tsx
it('chỉ tên đội xung đột: chỉ liệt kê "tên đội"', ...)
it('đội hình xung đột: liệt kê nhãn ngày và cảnh báo người vắng', ...)
  // text 'Người đã báo vắng có thể bị đặt lại vào đội hình.'
it('Tải bản mới nhất gọi onReload', ...)
it('Vẫn ghi đè gọi onOverwrite; nút có variant destructive', ...)
it('Đóng gọi onClose, không gọi hai cái kia', ...)
it('không phần nào xung đột: dialog đóng', ...)
```

- [ ] **Bước 2: code component** - presentation-only, `open = isFormationStale || isTeamNamesStale`.
  Tiêu đề `Có người vừa lưu trước bạn`; danh sách phần xung đột (`Đội hình <formationLabel>`, `Tên đội`);
  dòng cảnh báo người vắng chỉ khi `isFormationStale`; ba nút `Tải bản mới nhất`, `Vẫn ghi đè`
  (`variant="destructive"`), `Đóng`. `onOverwrite` là async: nút tắt khi đang chạy (dùng
  `MutationPendingContext` của shell để không đóng giữa chừng).
- [ ] **Bước 3: nối vào màn**

```tsx
<SaveConflictDialog
  formationLabel={activeSessionLabel}
  isFormationStale={screen.draft.isStale}
  isTeamNamesStale={screen.teamNames.isStale}
  onReload={() => {
    if (screen.draft.isStale) screen.draft.discardStale();
    if (screen.teamNames.isStale) screen.teamNames.discardStale();
  }}
  onOverwrite={() =>
    Promise.all([
      screen.draft.isStale ? screen.draft.overwriteStale() : undefined,
      screen.teamNames.isStale ? screen.teamNames.overwriteStale() : undefined,
    ]).then(() => undefined)
  }
  onClose={() => {
    screen.draft.dismissStale();
    screen.teamNames.dismissStale();
  }}
/>
```

  `activeSessionLabel` lấy từ
  `screen.selection.sessions` theo `activeSessionId` (`label`).
- [ ] **Bước 4:** `pnpm --filter web test -- "save-conflict-dialog|team-builder-screen"` → PASS.
- [ ] **Bước 5:** commit.

### Task 8: Tài liệu + kiểm tra cuối

**Files:** `docs/architecture.md` (§8 bỏ "No optimistic locking on the roster", giữ cho tactic; §5 dòng
`BattleSession`, `TeamName`, thêm `TeamNameVersion`, dòng `FormationSlot` - gỡ người tăng version;
bảng endpoint: body có `version`, sai version 412; erDiagram thêm `TeamNameVersion { }` vào nhóm không
quan hệ), `docs/custom-spec/2026-09-07-flow-audit-overview.md` (AD5 → đã xử lý, link spec F14).

- [ ] **Bước 1:** sửa tài liệu như trên.
- [ ] **Bước 2:** `pnpm --filter api lint && pnpm --filter api typecheck && pnpm --filter api test`;
  `pnpm --filter web lint && pnpm --filter web typecheck && pnpm --filter web test` → xanh.
- [ ] **Bước 3:** thử tay (skill `run`): hai tab cùng `/xep-team`, cùng ngày; tab A lưu, tab B lưu →
  dialog; thử ba nút. Đổi tên đội ở tab B khi A đã đổi → dialog chỉ "Tên đội".
- [ ] **Bước 4:** `git diff --shortstat main...HEAD` - quá 900 thì dừng, hỏi.
- [ ] **Bước 5:** commit; `review-loop` (vòng cuối `pr-review` trong agent `reviewer` riêng). PR body:
  migration chạy production khi merge; tab `/xep-team` mở từ trước deploy phải tải lại (spec §5 cửa sổ
  deploy).
