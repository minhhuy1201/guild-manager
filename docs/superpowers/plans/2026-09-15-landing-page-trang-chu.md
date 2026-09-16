# Trang giới thiệu bang hội `/trang-chu`: Implementation Plan

**Goal:** Một route công khai `/trang-chu` giới thiệu Mèo Mập Giang Hồ (hard PVP, mục tiêu bảng A,
bốn người trong ban chỉ huy có chỗ trống để thả ảnh đại diện), và một lối bấm sang màn điểm danh đổi
đích theo phiên.

**Architecture:** Chỉ đổi `apps/web`. Một feature mới `features/landing/` chứa toàn bộ nội dung và
bố cục; `app/trang-chu/page.tsx` mỏng. Ba file sẵn có bị chạm ở mức nhỏ nhất: `access.ts` thêm một
route công khai, `discord-login-button.tsx` thêm một prop `label` không bắt buộc,
`site-header.tsx` mở lối cho khách. Không API, không `packages/shared`, không migration, không biến
môi trường.

**Tech Stack:** Next.js 16 App Router (Server Component), Tailwind 4, shadcn/ui base-nova trên Base
UI (`Avatar`, `Button`, `Badge`, `Card`), `lucide-react`, Vitest + Testing Library.

**Spec:** [`docs/superpowers/specs/2026-09-15-landing-page-trang-chu-design.md`](../specs/2026-09-15-landing-page-trang-chu-design.md)

## Global Constraints

- Comment, JSDoc, tên biến, tên file: tiếng Anh. Chữ hiện ra cho người dùng và tên test: tiếng Việt.
- **Không em dash** ở bất kỳ đâu, kể cả trong comment.
- Đường dẫn route lấy từ `ROUTES`, không bao giờ là chuỗi rời.
- Không dependency mới. Không `"use client"` trong feature `landing`.
- Không đổi `/`, luồng OAuth, hay bất cứ gì trong `apps/api` / `packages/shared`.
- Nhánh: `claude/gallant-mccarthy-p9si5r`.
- Lệnh kiểm: `pnpm --filter web test`, `pnpm --filter web lint`, `pnpm --filter web typecheck`,
  `pnpm --filter web build`, và kiểm định dạng bằng Prettier như CI.

---

### Task 1: `/trang-chu` là route công khai

**Files:** sửa `apps/web/config/routes.ts`, `apps/web/features/auth/core/access.ts`; sửa test
`apps/web/features/auth/core/__tests__/access.test.ts`.

- [ ] Test đỏ trong `access.test.ts`: `"khách xem được trang giới thiệu"` —
      `decideAccess({ pathname: "/trang-chu", role: null })` trả `"allow"`; thành viên và quản trị
      viên cũng `"allow"`.
- [ ] Xác nhận đỏ.
- [ ] `routes.ts`: thêm `landing: "/trang-chu"`.
- [ ] `access.ts`: `PUBLIC_PATH_PREFIXES` nhận thêm `ROUTES.landing`; sửa comment "The only public
      routes" cho đúng thực tế mới (hai route, và vì sao landing nằm trong đó).
- [ ] Xanh. Chưa commit, gộp với Task 2.

### Task 2: Nội dung bang hội thành dữ liệu có kiểu

**Files:** tạo `apps/web/features/landing/lib/guild-info.ts`,
`apps/web/features/landing/__tests__/guild-info.test.ts`.

**Interfaces:**

```ts
interface GuildLeader {
  name: string;
  role: string;        // "Bang chủ" | "Leader" | "Quản lý"
  title: string;       // một câu ngắn về việc người này lo
  avatarSrc: string;   // /img/members/<slug>.png
  initials: string;    // chữ hiện khi chưa có ảnh
}
export const GUILD_LEADERS: readonly GuildLeader[];
export const GUILD_PILLARS: readonly GuildPillar[];   // ba ý của khối định hướng
export const JOIN_STEPS: readonly JoinStep[];         // ba bước của khối "vào bang thế nào"
```

- [ ] Test đỏ: `"ban chỉ huy đủ bốn người theo đúng thứ tự"` (LightAries/Bang chủ, Leonie/Leader,
      huy/Quản lý, spygutie/Quản lý); `"mỗi người có chỗ ảnh dưới /img/members và chữ viết tắt"`.
- [ ] Xác nhận đỏ (module chưa có).
- [ ] Viết `guild-info.ts`. Icon của `GUILD_PILLARS` và `JOIN_STEPS` là `LucideIcon` lấy từ
      `lucide-react` (`Swords`, `Trophy`, `ClipboardCheck`, `MessageCircle`, `CalendarCheck`,
      `Users`), giữ một họ icon cho cả app.
- [ ] Tạo `apps/web/public/img/members/.gitkeep` để thư mục ảnh tồn tại trong git khi còn rỗng.
- [ ] Xanh. Commit `feat(web): open /trang-chu to visitors and describe the guild`.

### Task 3: Cảnh của landing

**Files:** sửa `apps/web/lib/page-banners.ts`; thêm `apps/web/public/img/bg/landing.jpg`.

- [ ] `cp apps/web/public/img/bg/login.jpg apps/web/public/img/bg/landing.jpg` (101KB; ảnh tạm, bang
      thay sau mà không đụng nền trang đăng nhập).
- [ ] `page-banners.ts`: thêm `LANDING_HERO: PageImage` cạnh `LOGIN_BACKDROP`, **không** vào
      `PAGE_BANNERS` (đó là các cảnh dành cho `PageHeader`; landing tự dựng hero). Comment nói rõ vì
      sao nó là một file riêng dù hiện trùng ảnh đăng nhập.
- [ ] Xanh nguội (không đổi hành vi nào đang có test). Gộp commit với Task 4.

### Task 4: Nút "Điểm danh ngay" đổi đích theo phiên

**Files:** sửa `apps/web/features/auth/components/discord-login-button.tsx`; tạo
`apps/web/features/landing/components/attendance-cta.tsx`,
`apps/web/features/landing/__tests__/attendance-cta.test.tsx`.

**Interfaces:** `AttendanceCta({ isSignedIn, size }: { isSignedIn: boolean; size?: "default" | "lg" })`.
`DiscordLoginButtonProps` nhận thêm `label?: string`, mặc định `"Đăng nhập bằng Discord"`.

- [ ] Test đỏ (`// @vitest-environment jsdom`): `"đã đăng nhập thì nút dẫn thẳng tới màn điểm danh"`
      (link `href` là `ROUTES.attendance`); `"chưa đăng nhập thì nút mở đăng nhập Discord và quay về
      màn điểm danh"` (`href` chứa `/auth/discord` và `redirect` đã encode của `ROUTES.attendance`);
      `"hai trạng thái dùng chung một nhãn"` (cả hai đều là `Điểm danh ngay`).
- [ ] Xác nhận đỏ.
- [ ] `discord-login-button.tsx`: thêm prop `label` với mặc định cũ, JSDoc nói vì sao (landing dùng
      chung nút này nhưng cần một nhãn duy nhất cho một ý định). Trang `/dang-nhap` không đổi.
- [ ] `attendance-cta.tsx`: đã đăng nhập thì `Button` bọc `next/link` tới `ROUTES.attendance` với
      icon `ClipboardCheck`; chưa đăng nhập thì `DiscordLoginButton redirect={ROUTES.attendance}
      label="Điểm danh ngay"`.
- [ ] Xanh. Commit `feat(web): send the landing call to action where the session allows`.

### Task 5: Hero và khối định hướng

**Files:** tạo `apps/web/features/landing/components/landing-hero.tsx`,
`apps/web/features/landing/components/guild-pillars.tsx`; test
`apps/web/features/landing/__tests__/landing-hero.test.tsx`.

- [ ] Test đỏ (jsdom): `"hero mang tên bang trong tiêu đề chính"` (`<h1>` = "Mèo Mập Giang Hồ");
      `"hero có nút điểm danh"`.
- [ ] Xác nhận đỏ.
- [ ] `landing-hero.tsx`: `min-h-[72svh]` (không `h-screen`), `pt-24` là trần đệm trên, `rounded-2xl`
      theo đúng thang bo góc của app, `BannerImage` với `LANDING_HERO` và hai lớp scrim như
      `PageHeader` (một dâng từ đáy, một từ trái). Nội dung dồn về trái, đúng **bốn** phần chữ:
      `GuildSeal size="lg"` + caption `逆水寒` (`lang="zh"`), `<h1>` serif, một câu định vị dưới 20
      từ, `AttendanceCta size="lg"`. Không dòng phụ dưới nút, không gợi ý cuộn.
- [ ] `guild-pillars.tsx`: bento ba ô cho đúng ba ý, `md:grid-cols-3 md:grid-rows-2`, ô lớn chiếm
      `md:col-span-2 md:row-span-2` và mang `/img/bg/team-builder.jpg` dưới scrim, ô "bảng A" lấy sắc
      `gold`, ô thứ ba để trơn trên `card`. Dưới `md` là một cột. Không ô trống.
- [ ] Xanh. Commit `feat(web): give the landing page its hero and guild pillars`.

### Task 6: Ban chỉ huy

**Files:** tạo `apps/web/features/landing/components/leadership-section.tsx`; test
`apps/web/features/landing/__tests__/leadership-section.test.tsx`.

- [ ] Test đỏ (jsdom): `"hiện đủ bốn người kèm vai trò"`; `"chưa có ảnh thì hiện chữ viết tắt"`
      (`AvatarFallback` render trong jsdom vì ảnh không tải được).
- [ ] Xác nhận đỏ.
- [ ] Component: `id="ban-chi-huy"`. Bang chủ là thẻ nổi bật bên trái (avatar `size-24`, tên serif,
      vai trò là `Badge` sắc gold); ba người còn lại là danh sách dọc bên phải (avatar `size-14`,
      tên, vai trò), ngăn nhau bằng `divide-y` thưa chứ không phải bốn thẻ bằng nhau. Dưới `md` xếp
      một cột.
- [ ] Ảnh dùng `Avatar` + `AvatarImage` + `AvatarFallback` của shadcn, **không** `next/image`: thiếu
      file thì fallback nhận chỗ thay vì lỗi runtime. Comment ghi lại lý do đó.
- [ ] Xanh. Commit `feat(web): introduce the guild leadership on the landing page`.

### Task 7: Vào bang thế nào, khối kêu gọi, và màn hoàn chỉnh

**Files:** tạo `apps/web/features/landing/components/join-steps.tsx`,
`apps/web/features/landing/components/attendance-invite.tsx`,
`apps/web/features/landing/components/landing-screen.tsx`,
`apps/web/features/landing/index.ts`, `apps/web/app/trang-chu/page.tsx`; test
`apps/web/features/landing/__tests__/landing-screen.test.tsx`.

- [ ] Test đỏ (jsdom): `"màn giới thiệu dựng đủ năm khối"` (tiêu đề chính + bốn tiêu đề phụ);
      `"khối cuối nói rõ cần đăng nhập Discord"`.
- [ ] Xác nhận đỏ.
- [ ] `join-steps.tsx`: ba bước xếp dọc, mỗi bước một icon trong khung vuông viền jade (nhại
      `GuildSeal`), một động từ làm tiêu đề và một dòng giải thích. Không nhãn "Bước 1/2/3", không
      thẻ, không hairline dưới từng dòng.
- [ ] `attendance-invite.tsx`: dải ngang canh giữa trên `card`, `OrnamentDivider tone="gold"
      align="center"`, tiêu đề, một dòng nói cần đăng nhập Discord, `AttendanceCta size="lg"`.
- [ ] `landing-screen.tsx`: xếp năm khối theo thứ tự, nhận `isSignedIn` và chuyền xuống. Mỗi khối là
      con trực tiếp của `<main>` nên thừa hưởng `page-enter` so le sẵn có trong `globals.css`.
- [ ] `index.ts`: chỉ xuất `LandingScreen`.
- [ ] `app/trang-chu/page.tsx`: `metadata` (title, description, `openGraph` dùng `/img/bg/landing.jpg`
      để liên kết dán vào Discord hiện tử tế), đọc `getSession()` từ `@/features/auth/server`, dựng
      `<LandingScreen isSignedIn={Boolean(session)} />`. Không `redirect`, không đọc `searchParams`.
- [ ] Xanh. Commit `feat(web): compose the guild landing page at /trang-chu`.

### Task 8: Lối vào cho khách trên header

**Files:** sửa `apps/web/components/shared/site-header.tsx`; test
`apps/web/components/shared/__tests__/site-header.test.tsx` (tạo nếu chưa có).

- [ ] Test đỏ (jsdom): `"khách bấm được tên bang để về trang giới thiệu"`; `"khách thấy nút đăng
      nhập"`; `"đã đăng nhập thì tên bang vẫn dẫn về màn điểm danh"`.
- [ ] Xác nhận đỏ.
- [ ] Sửa nhánh signed out: khối thương hiệu thành `Link href={ROUTES.landing}` thay vì `<div>`, và
      bên phải thêm `Button variant="outline" size="sm"` bọc `Link` tới `ROUTES.login`. Sửa hai
      comment đang nói "mọi route đều cần phiên" cho khớp thực tế mới.
- [ ] Nav chính và tab bar giữ nguyên: không thêm mục "Trang chủ".
- [ ] Xanh. Commit `feat(web): let a visitor reach the landing page and sign in from the header`.

### Task 9: Nghiệm thu và tài liệu

**Files:** sửa `docs/architecture.md` (§4.2 cây thư mục, danh sách feature, §4.3 câu "the only page a
visitor without a session can reach"), `apps/web/docs/frontend.md` (§2 cây thư mục, §1 danh sách
feature, §6 thêm quy ước của landing), `docs/design-direction.md` (mục Imagery: cảnh của landing).

- [ ] Chạy `pnpm --filter web test`, `lint`, `typecheck`, `build` — tất cả xanh.
- [ ] Kiểm định dạng bằng Prettier đúng như CI.
- [ ] Đọc lại toàn bộ chữ hiện ra trên trang: không em dash, không câu tối nghĩa, không số liệu bịa,
      không nhãn số thứ tự khối, không gợi ý cuộn. Đếm eyebrow: tối đa 1 cho cả trang.
- [ ] Kiểm bằng mắt ở cả chế độ sáng và tối, ở bề rộng 360px và 1440px: hero vừa một màn hình, mọi
      lưới về một cột dưới 768px, chữ trắng trên ảnh vẫn đọc được, không nút nào chữ trắng trên nền
      trắng, nhãn nút không xuống dòng.
- [ ] Cập nhật ba tài liệu ở trên.
- [ ] Commit `docs: record the landing page in the architecture and frontend references`.
- [ ] Push lên `claude/gallant-mccarthy-p9si5r`.
