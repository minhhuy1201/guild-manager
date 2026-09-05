# Đặt tên cho từng đội trên lưới đội hình — Implementation Plan

**Goal:** Double-click vào header của một cột đội để đổi tên; Enter hoặc click ra ngoài chốt vào nháp,
Escape huỷ; nút "Lưu" của màn hình lưu cả đội hình lẫn tên, có lớp phủ báo đang chờ API.

**Architecture:** Tên đội là dữ liệu **global** (bảng `TeamName`, khoá chính là số đội), không nằm
trong payload đội hình của từng ngày. Vì vậy nó có endpoint riêng (`GET`/`PUT /team-builder/team-names`),
query riêng, nháp Zustand riêng — nhưng **chung một nút Lưu** với đội hình: toolbar hợp nhất hai
nguồn dirty và bắn song song hai mutation, chỉ gọi cái nào đang bẩn.

**Tech Stack:** NestJS 11 · Prisma 7 + PostgreSQL · Zod 4 (nestjs-zod) · Jest · Next.js App Router ·
TanStack Query · Zustand · Vitest · pnpm workspace.

**Spec:** [docs/superpowers/specs/2026-08-29-team-name-inline-edit-design.md](../specs/2026-08-29-team-name-inline-edit-design.md)

## Global Constraints

- **TDD**: mỗi task viết test trước, chạy cho nó đỏ, rồi mới viết code cho xanh. Test mô tả **hành vi**,
  không mô tả cách cài đặt.
- Chữ hiển thị cho người dùng bằng **tiếng Việt**; tên file, định danh, commit message bằng tiếng Anh.
  Tên test viết tiếng Việt, theo đúng các file test sẵn có trong hai module này.
- Comment/JSDoc theo ngôn ngữ của file đang sửa (backend tiếng Việt, `apps/web/features/team-builder`
  tiếng Anh).
- Shape đi qua network chỉ khai báo một lần ở `packages/shared`.
- Frontend: server state → TanStack Query, nháp → Zustand, **không bao giờ** để response API vào store.
- Backend: Controller → Service → Prisma (module team-builder không có tầng repository).
- Nhánh `feat/team-name-inline-edit`, mỗi task một commit, không dòng `Co-Authored-By`.
- Lệnh kiểm tra cuối: `pnpm --filter api test`, `pnpm --filter web test`, `pnpm --filter api build`,
  `pnpm --filter web build`.

## Trạng thái khởi điểm

Commit `d7e76ad` đã có sẵn (viết **trước** khi có test — Task 1 và 2 phải trả nợ phần test đó):

- `packages/shared/schemas/formation.schema.ts` — `TEAM_NAME_MAX_LENGTH`, `teamNamesSchema`,
  `saveTeamNamesSchema`.
- `prisma/schema.prisma` + migration `20260829064510_them_bang_ten_doi` (đã apply, đã bật RLS).
- `TeamBuilderService.getTeamNames/saveTeamNames`, hai endpoint trên controller, `SaveTeamNamesDto`.
- Web: `fetchTeamNames`/`saveTeamNames`, `teamBuilderKeys.teamNames()`, `useTeamNames`,
  `useSaveTeamNames`, `store/team-name-store.ts`.

---

## File Structure

**Tạo mới**

| File | Trách nhiệm |
|---|---|
| `apps/api/src/modules/team-builder/__tests__/team-name.service.spec.ts` | Test đọc/ghi map tên |
| `apps/web/features/team-builder/store/__tests__/team-name-store.test.ts` | Test luật nháp tên |
| `apps/web/features/team-builder/hooks/use-team-name-draft.ts` | Gộp bản đã lưu + nháp, dirty, lưu |
| `apps/web/features/team-builder/hooks/__tests__/use-team-name-draft.test.ts` | Test hook trên |
| `apps/web/features/team-builder/components/team-name-field.tsx` | Header đọc/sửa của một cột đội |

**Sửa**

| File | Đổi gì |
|---|---|
| `apps/api/src/modules/team-builder/__tests__/team-builder.controller.spec.ts` | Hai endpoint mới uỷ quyền đúng |
| `apps/web/features/team-builder/hooks/use-formation-screen.ts` | Thêm nhánh `teamNames` |
| `apps/web/features/team-builder/hooks/__tests__/render-formation-hook.ts` | Reset thêm store tên |
| `apps/web/features/team-builder/components/team-builder-screen.tsx` | Nối toolbar hợp nhất + lớp phủ |
| `apps/web/features/team-builder/components/formation-toolbar.tsx` | Nhận dirty/saving đã hợp nhất, đổi nhãn nút |
| `apps/web/features/team-builder/components/formation-grid.tsx` | Truyền `names`/`onNameChange`, bọc lớp phủ `saving` |
| `apps/web/features/team-builder/components/team-column.tsx` | Header dùng `TeamNameField` |
| `docs/architecture.md` | Bảng endpoint, bảng data model, ô "Owns" của module |

---

### Task 1: Test cho service tên đội

Trả nợ test cho code đã viết ở `d7e76ad`. Viết test trước khi đọc lại phần cài đặt, để test mô tả
hành vi mong muốn chứ không chép lại code.

**Files:** Create `apps/api/src/modules/team-builder/__tests__/team-name.service.spec.ts`

- [ ] **Step 1:** Test `getTeamNames`
  - Trả về map `số đội (chuỗi) → tên` từ các hàng trong bảng.
  - Không có hàng nào ⇒ trả về `{}`, không phải `null`.
- [ ] **Step 2:** Test `saveTeamNames`
  - Ghi đè: xoá sạch rồi tạo lại, cả hai trong **một** transaction.
  - Map rỗng ⇒ vẫn xoá sạch, **không** gọi `createMany` với mảng rỗng.
  - Trả về đúng map vừa ghi.
  - Không gọi tới `battleSessions`/`characters`: tên đội không thuộc ngày đánh nào nên không có
    kiểm tra khoá trận.

### Task 2: Test cho controller và store nháp

**Files:**
- Modify: `apps/api/src/modules/team-builder/__tests__/team-builder.controller.spec.ts`
- Create: `apps/web/features/team-builder/store/__tests__/team-name-store.test.ts`

- [ ] **Step 1:** Controller — `getTeamNames` và `saveTeamNames` uỷ quyền thẳng cho service, `saveTeamNames`
  truyền `body.names`.
- [ ] **Step 2:** Store — `setName` lần đầu dựng nháp từ bản đã lưu; tên rỗng/toàn khoảng trắng thì
  **xoá khoá** chứ không lưu chuỗi rỗng; tên được `trim`; `clearDraft` trả nháp về `null`; nháp cũ
  không bị bản đã lưu ghi đè ở lần `setName` sau.

### Task 3: Hook `useTeamNameDraft`

Nơi duy nhất biết "tên đang hiện là gì" = nháp nếu có, bản đã lưu nếu không.

**Files:**
- Create: `apps/web/features/team-builder/hooks/__tests__/use-team-name-draft.test.ts`
- Create: `apps/web/features/team-builder/hooks/use-team-name-draft.ts`
- Modify: `apps/web/features/team-builder/hooks/__tests__/render-formation-hook.ts`

**Interfaces:**
```ts
export interface TeamNameDraftState {
  names: TeamNames;              // nháp nếu có, bản đã lưu nếu không
  dirty: boolean;                // nháp khác bản đã lưu
  saving: boolean;
  saveErrorMessage: string | undefined;
  setName: (team: number, name: string) => void;
  reset: () => void;
  save: () => Promise<void>;     // no-op khi không bẩn
}
```

- [ ] **Step 1:** Test — chưa sửa gì thì `names` là bản đã lưu và `dirty` là `false`; `setName` xong
  `dirty` thành `true`; **gõ lại đúng tên cũ thì `dirty` về `false`** (so sánh giá trị, không so sánh
  tham chiếu); `reset` bỏ nháp; `save` khi không bẩn thì không gọi API; `save` thành công thì xoá nháp;
  `save` lỗi thì **giữ nguyên nháp** và trả message tiếng Việt của backend.
- [ ] **Step 2:** Viết hook cho xanh.

### Task 4: `TeamNameField` và header của cột đội

**Files:**
- Create: `apps/web/features/team-builder/components/team-name-field.tsx`
- Modify: `apps/web/features/team-builder/components/team-column.tsx`

Không có test tự động cho tầng này (repo chưa test component nào); hành vi được chốt bằng tay theo
mục 5 của spec.

- [ ] **Step 1:** Chế độ đọc là `<button>` hiện `tên ?? số đội`, `onDoubleClick` và Enter/Space đều mở
  ô nhập; `readOnly` thì render `<span>`, không phải button.
- [ ] **Step 2:** Chế độ sửa: `autoFocus`, `select()`, Enter/blur chốt, Escape huỷ, `maxLength`.
- [ ] **Step 3:** `TeamColumn` nhận `name`/`onNameChange`, header giữ nguyên `bg-primary`.

### Task 5: Nối màn hình — nút Lưu chung và lớp phủ

**Files:** Modify `use-formation-screen.ts`, `team-builder-screen.tsx`, `formation-toolbar.tsx`,
`formation-grid.tsx`

- [ ] **Step 1:** `useFormationScreen` trả thêm nhánh `teamNames`.
- [ ] **Step 2:** Toolbar nhận dirty/saving đã hợp nhất; nhãn nút đổi thành "Lưu"/"Đang lưu...";
  hai message lỗi nối lại, không nuốt cái nào.
- [ ] **Step 3:** Màn hình bắn `Promise.all` hai `save`, chỉ cái nào bẩn; "Đặt lại" xoá cả hai nháp.
- [ ] **Step 4:** `FormationGrid` bọc lớp phủ `bg-background/60` + spinner khi `saving`.

### Task 6: Đồng bộ tài liệu và chạy kiểm tra

**Files:** Modify `docs/architecture.md`

- [ ] **Step 1:** Thêm 2 dòng vào bảng endpoint (§3.3), thêm `TeamName` vào bảng data model (§5), sửa
  ô "Owns" của module team-builder thành "Per-match formations, team names".
- [ ] **Step 2:** Chạy `pnpm --filter api test`, `pnpm --filter web test`, rồi build cả hai app.
