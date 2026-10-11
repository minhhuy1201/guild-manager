# Trang giới thiệu bang hội `/trang-chu` — Design

Ngày: 2026-09-15 · Phạm vi: `apps/web` (feature `landing` mới, `features/auth/core/access.ts`,
`features/auth/components/discord-login-button.tsx`, `components/shared/site-header.tsx`,
`config/routes.ts`, `lib/page-banners.ts`, `public/img/`), tài liệu.
Không đụng database, biến môi trường. Phần bổ sung 2026-09-16 ở cuối file kéo thêm `apps/api`
(`discord-bot/entry-buttons.ts`, `auth/oauth-redirect.ts`) và `packages/shared/lib`.

## Bối cảnh

Hôm nay `apps/web` là một công cụ nội bộ đóng kín: `decideAccess` cho **đúng một** route công khai là
`/dang-nhap`, mọi đường khác đều bị `proxy.ts` đá về đó. Người ngoài gõ địa chỉ web của bang chỉ thấy
một tấm thẻ đăng nhập trên nền ảnh — không biết bang tên gì ngoài dòng "Mèo Mập Giang Hồ", chơi kiểu
gì, ai cầm bang, đang nhắm cái gì.

Bang cần một trang quảng bá: ai cũng mở được, đọc một lượt là hiểu **Mèo Mập Giang Hồ là bang hard
PVP, mục tiêu bảng A, ban chỉ huy gồm bốn người**, và có một chỗ rõ ràng để đi vào màn điểm danh.

Spec này thêm route công khai thứ hai, `/trang-chu`, và chỉ có thế. Nó **không** đổi trang điểm danh,
không đổi luồng đăng nhập, không thêm dữ liệu động: nội dung trang là hằng số trong mã nguồn.

## Đọc đề bài (design read)

> Landing page giới thiệu bang hội, cho hai nhóm người đọc: người chơi Nghịch Thuỷ Hàn đang cân nhắc
> vào bang (đọc lần đầu, trên điện thoại) và thành viên đã có tài khoản (vào để bấm sang điểm danh).
> Ngôn ngữ thị giác lấy nguyên hệ thống sẵn có của app — wuxia 70/20/10 theo
> [`docs/design-direction.md`](../../design-direction.md), token jade/gold/navy, Noto Serif cho tiêu
> đề, shadcn base-nova trên Base UI.

Ba núm điều chỉnh của trang:

| Núm | Giá trị | Vì sao |
|---|---|---|
| `DESIGN_VARIANCE` | 7 | Landing được phép lệch hơn các trang công cụ: hero lệch trái, bento bất đối xứng, ban chỉ huy một người nổi bật. Nhưng vẫn phải nhận ra là cùng một app. |
| `MOTION_INTENSITY` | 5 | Đúng bằng vốn chuyển động đã có (`page-enter`, `--animate-reveal`, fade của `BannerImage`). Không thêm thư viện animation. |
| `VISUAL_DENSITY` | 3 | Trang đọc một lượt, không phải bảng dữ liệu. Khoảng thở rộng hơn các trang công cụ. |

### Những chỗ cố tình đi ngược mặc định của skill thiết kế

Quy ước của repo (CLAUDE.md, `docs/design-direction.md`) thắng, và đây là các điểm lệch có chủ đích:

- **`lucide-react`**, không phải Phosphor/Tabler: cả app đã dùng Lucide, một họ icon cho một dự án.
- **Noto Serif cho tiêu đề**: serif là bản sắc thương hiệu đã chốt, không phải phản xạ "creative =
  serif".
- **Bảng màu neutral ấm + jade/gold**: đã có sẵn trong `globals.css`, landing không được đẻ màu mới.
- **Không thêm `motion` / GSAP**: chuyển động đã đủ ở tầng CSS toàn cục và tự tắt theo
  `prefers-reduced-motion`. Thêm dependency cho một trang tĩnh là vi phạm YAGNI.

## Quyết định

### 1. `/trang-chu` là route công khai thứ hai, không phải trang chủ mới

`ROUTES.attendance` vẫn là `/`. Landing nằm ở `/trang-chu` và **không** chiếm chỗ của trang điểm danh.

Lý do: thành viên vào app hằng tuần để điểm danh; bắt họ qua một trang quảng bá rồi mới tới việc là
đổi một cú bấm thành hai, mỗi tuần, cho toàn bang, chỉ để phục vụ người lạ vào một lần. Người lạ chịu
gõ thêm đường dẫn; thành viên thì không nên chịu gì cả.

`PUBLIC_PATH_PREFIXES` trong `features/auth/core/access.ts` nhận thêm `ROUTES.landing`. Đó là **thay
đổi quyền truy cập duy nhất** của spec này — `proxy.ts` không sửa dòng nào, matcher của nó đã phủ mọi
route.

Phương án đã loại: cho `/` tự đổi mặt theo phiên (khách thấy landing, thành viên thấy điểm danh). Nó
làm một route mang hai trang, `getSession()` thành nhánh bố cục thay vì kiểm tra quyền, và cache của
Next phải phân biệt theo cookie. Hai đường dẫn tách bạch rẻ hơn nhiều.

### 2. Nội dung là hằng số trong mã nguồn, không phải dữ liệu từ API

Ban chỉ huy, định hướng, nhịp tuần đều nằm trong `features/landing/lib/guild-info.ts` dưới dạng
`const` có kiểu. Không endpoint mới, không bảng mới, không biến môi trường.

Lý do: bốn cái tên và một câu mục tiêu đổi vài lần một năm. Một endpoint `GET /guild/profile` kèm
bảng, DTO, schema trong `packages/shared`, màn quản trị để sửa — tất cả để tránh một lần sửa file mỗi
quý — là cái giá sai. Khi bang muốn tự sửa mà không cần deploy thì mở lại quyết định này.

Hệ quả phải chấp nhận: đổi tên một quản lý là một PR.

### 3. Ảnh đại diện là chỗ trống có sẵn, không phải ảnh giả

Mỗi người trong ban chỉ huy trỏ tới một đường dẫn cố định dưới `public/img/members/`:

| Người | Vai trò | Đường dẫn ảnh |
|---|---|---|
| LightAries | Bang chủ | `/img/members/lightaries.png` |
| Leonie | Leader | `/img/members/leonie.png` |
| huy | Quản lý | `/img/members/huy.png` |
| spygutie | Quản lý | `/img/members/spygutie.png` |

Dựng bằng `Avatar` của shadcn (`AvatarImage` + `AvatarFallback`), **không** phải `next/image`. Đây là
điểm mấu chốt: `AvatarImage` của Base UI chỉ hiện khi ảnh tải xong, thiếu file thì `AvatarFallback`
nhận chỗ và vẽ chữ cái đầu trên nền jade. Nghĩa là trang chạy đẹp **ngay khi chưa có ảnh nào**, và
thả một file PNG đúng tên vào thư mục là xong — không sửa mã, không build lại gì ngoài deploy.
`next/image` thì ngược lại: thiếu file là lỗi runtime.

Thư mục có một `.gitkeep` để tồn tại trong git khi còn rỗng.

### 4. Một lời kêu gọi, một nhãn: "Điểm danh ngay"

Trang có hai chỗ bấm sang điểm danh (cuối hero và cuối trang) nhưng **chỉ một nhãn**. Hai nhãn khác
nhau cho cùng một việc ("Điểm danh ngay" / "Vào điểm danh") là thứ làm người đọc tưởng có hai đích.

Nút đọc phiên trên server và đổi đích, không đổi chữ:

- **Đã đăng nhập** → `Link` tới `ROUTES.attendance`, icon `ClipboardCheck`.
- **Chưa đăng nhập** → đúng cái nút OAuth sẵn có (`DiscordLoginButton`) với
  `redirect={ROUTES.attendance}`, icon Discord.

Nhánh "chưa đăng nhập" đi thẳng vào Discord thay vì qua `/dang-nhap` rồi mới bấm tiếp: bớt một chặng,
và `?redirect=` đã lo việc đưa người ta về đúng màn điểm danh sau khi xong.

`DiscordLoginButton` vì thế nhận thêm một prop `label` không bắt buộc, mặc định giữ nguyên "Đăng nhập
bằng Discord" để trang `/dang-nhap` không đổi một chữ nào.

Ở cuối hero, nút đứng một mình. Ở khối cuối trang mới có thêm một dòng nói rõ cần đăng nhập Discord —
hero phải gọn, phần giải thích thuộc về chỗ có chỗ cho nó.

### 5. Header có lối vào cho khách

Hôm nay `SiteHeader` khi chưa đăng nhập chỉ là con dấu, vì mọi route đều cần phiên nên chẳng có gì để
liên kết tới. Có `/trang-chu` rồi thì khác:

- Con dấu và tên bang thành liên kết tới `ROUTES.landing` (thay vì `<div>` trơ).
- Bên phải hiện một nút `Đăng nhập` dạng `outline` trỏ tới `ROUTES.login`.

Thanh nav chính và tab bar dưới đáy vẫn chỉ hiện khi đã đăng nhập, và **không** nhận mục "Trang chủ":
landing là trang cho người ngoài, không phải công cụ hằng tuần.

### 6. Bố cục: năm khối, năm họ bố cục khác nhau

Trang landing hỏng theo một kiểu quen thuộc — tám khối trông giống nhau, mỗi khối một nhãn chữ hoa
nhỏ ở trên. Ràng buộc để tránh: **không họ bố cục nào lặp lại**, và **cả trang chỉ một nhãn eyebrow**
(trần là `ceil(5 / 3)` = 2, dùng 1).

| # | Khối | Họ bố cục | Nội dung |
|---|---|---|---|
| 1 | Hero | Cảnh tràn viền, chữ dồn về trái | Con dấu + 逆水寒, `<h1>` "Mèo Mập Giang Hồ", một câu định vị, nút "Điểm danh ngay" |
| 2 | Định hướng | Bento 3 ô bất đối xứng (1 lớn + 2 nhỏ) | Hard PVP · Mục tiêu bảng A · Điểm danh là kỷ luật |
| 3 | Ban chỉ huy | Một người nổi bật + danh sách dọc 3 người | Bốn người, ảnh đại diện, vai trò |
| 4 | Vào bang thế nào | Ba bước xếp dọc, không thẻ | Vào Discord · Điểm danh trong tuần · Nhận đội hình |
| 5 | Kêu gọi điểm danh | Dải ngang, canh giữa | "Điểm danh ngay" + một dòng về đăng nhập Discord |

Ràng buộc bố cục cụ thể:

- **Hero vừa một màn hình**: `min-h-[72svh]`, không `h-screen` (thanh địa chỉ iOS làm nó nhảy). Tiêu
  đề tối đa hai dòng, câu định vị tối đa 20 từ, nút nhìn thấy mà không cần cuộn. Đệm trên tối đa
  `pt-24`.
- **Hero có đúng bốn phần chữ**: dải thương hiệu (con dấu + 逆水寒), tiêu đề, câu định vị, nút. Không
  dòng phụ dưới nút, không dải "được tin dùng bởi", không gạch đầu dòng.
- **Bento có đúng ba ô cho ba ý** — không ô trống, không ô độn. Ô lớn mang một cảnh trong game (có
  scrim), ô "bảng A" mang sắc gold, ô còn lại để trơn: một lưới toàn thẻ trắng chữ đen là dấu hiệu
  của trang dựng máy.
- **Không nhãn số thứ tự khối** (`01 · Định hướng`), **không gợi ý cuộn** ("Kéo xuống"), **không dải
  chữ trang trí** đáy hero, **không dấu chấm màu trang trí**, **không em dash** ở bất kỳ đâu.
- **Dưới 768px mọi lưới về một cột.** Khai báo ngay tại component, không phó mặc "Tailwind lo".

### 7. Cảnh của landing là file riêng, dù ban đầu trùng ảnh đăng nhập

`lib/page-banners.ts` nhận thêm `LANDING_HERO: PageImage` trỏ tới `/img/bg/landing.jpg`, đặt cạnh
`LOGIN_BACKDROP` chứ không vào `PAGE_BANNERS` — `PAGE_BANNERS` là các cảnh cho `PageHeader`, còn
landing tự dựng hero của nó.

File `landing.jpg` ban đầu là bản sao của `login.jpg` (101KB). Trỏ thẳng vào `login.jpg` thì rẻ hơn
một file, nhưng lúc bang muốn đổi cảnh landing họ sẽ đổi luôn cả nền trang đăng nhập mà không biết.
Một khoá riêng, một file riêng: thay ảnh landing là thay đúng landing.

Ô lớn của bento dùng lại `/img/bg/team-builder.jpg` với khung cắt khác — nó là ảnh trong khối, không
phải "cảnh của trang", nên dùng chung không phạm luật một cảnh một trang.

Ảnh vẫn được ghi công một lần duy nhất ở `SiteFooter`, vốn đã nằm trong layout gốc.

### 8. Trang là Server Component, chuyển động mượn của hệ thống

`app/trang-chu/page.tsx` mỏng: đọc `getSession()`, dựng `<LandingScreen isSignedIn={...} />`. Cả
feature `landing` không có một dòng `"use client"` nào — trừ `BannerImage` sẵn có, thứ vốn đã là
client component.

Chuyển động lấy nguyên vốn có trong `globals.css`: `main > *` đã có `page-enter` so le theo thứ tự
khối, `BannerImage` fade lên trên màu nền, `prefers-reduced-motion` đã tắt tất cả ở một chỗ. Không
`window.addEventListener("scroll")`, không scroll hijack, không vòng lặp vô hạn.

Hệ quả: `MOTION_INTENSITY: 5` là thứ đo được trên trang, không phải lời tuyên bố.

### 9. Chế độ sáng tối và tương phản

Trang khoá một chủ đề như cả app: token trong `globals.css`, `.dark` có sẵn, không khối nào tự lật
sáng/tối giữa chừng.

Hai chỗ phải kiểm bằng mắt ở cả hai chế độ vì chữ nằm trên ảnh:

- Hero: chữ trắng trên cảnh, hai lớp scrim như `PageHeader` (một dâng từ đáy, một từ trái).
- Ô lớn của bento: cùng công thức.

Nút không bao giờ là chữ trắng trên nền trắng: nút chính là `primary` (navy) với
`primary-foreground`, nút phụ là `outline` trên `card`.

## Phạm vi và những gì cố tình không làm

Có:

- Route công khai `/trang-chu`, feature `landing`, năm khối nội dung.
- Chỗ trống ảnh đại diện cho bốn người, thả file là hiện.
- Lối vào điểm danh đổi theo phiên, và lối đăng nhập trên header cho khách.
- `openGraph` cho trang, để liên kết dán vào Discord hiện ra tử tế.

Không có, và vì sao:

- **Không form đăng ký vào bang.** Chưa có endpoint, chưa có nơi nhận. Muốn vào bang thì liên hệ ban
  chỉ huy qua Discord; đó cũng là điều bước 1 của khối 4 nói.
- **Không số liệu thành tích** (thứ hạng, tỉ lệ thắng). Không có nguồn thật, và bịa số cho đẹp là
  thứ trang này phải tránh nhất.
- **Không quản trị nội dung landing.** Xem quyết định 2.
- **Không `sitemap.xml` / `robots.txt`.** Chưa thuộc bài toán này.
- **Không đổi `/`, luồng OAuth, hay bất cứ gì phía API.**

## Bổ sung sau khi triển khai (2026-09-16)

Quyết định 1 nói `/trang-chu` là một đường riêng và `/` không đổi. Sau khi nhìn lại thực tế deploy
thì vế sau tự bắn vào chân mục tiêu của chính spec này: địa chỉ người ta đưa nhau là trần tên miền,
nên người lạ gõ vào vẫn chỉ thấy thẻ đăng nhập, còn trang giới thiệu thì không ai gõ tới.

Hai thay đổi, và chỉ hai:

1. **`/` lúc chưa đăng nhập đi tới `/trang-chu`** thay vì `/dang-nhap` (`decideAccess` có thêm phán
   quyết `landing`). Chỉ đúng `/`: mọi đường khác là do người ta chủ động gõ, đá họ sang trang giới
   thiệu là làm mất chỗ họ đang muốn tới. Thành viên có phiên nên không bao giờ chạm vào nhánh này,
   màn điểm danh vẫn cách trần tên miền đúng không cú nào. Thiếu `AUTH_SECRET` thì vẫn về trang đăng
   nhập, vì đó là màn duy nhất in ra `WEB_AUTH_ERROR.sessionInvalid`.
2. **Nút "🌐 Mở website" của bot trỏ vào `/dang-nhap?redirect=%2F`** thay vì trần origin. Ai đọc cái
   nút đó cũng đang ở Discord của bang và định đi điểm danh, không phải đi đọc giới thiệu. Kèm theo,
   `/dang-nhap` giờ đẩy người đã đăng nhập đi tiếp thay vì hiện form cho người đang đăng nhập, nên
   thành viên bấm nút vẫn tới thẳng màn điểm danh.

`redirect` là tham số trên URL nên nó đi qua `safeRedirect`. Luật đó chuyển từ
`apps/api/src/modules/auth/oauth-redirect.ts` sang `@guild/shared/lib`: hai đầu của luồng đăng nhập
cùng lọc một giá trị, và hai bản sao thì bản nào lệch sẽ là bản có lỗ open redirect.

Lúc chuyển thì lòi ra một lỗ có sẵn trong chính luật đó: nó chỉ soi `//`, trong khi trình duyệt đổi
`\` thành `/` trước khi resolve, nên `/\evil.example` ra thẳng `https://evil.example/` mà vẫn qua
được. Tab, xuống dòng và khoảng trắng cũng bị nuốt lúc resolve nên lận được authority y hệt. Luật giờ
từ chối cả ba. Lỗ này có từ trước, nhưng cái nút trong Discord làm nó dễ khai thác hẳn lên - dán một
link `/dang-nhap?redirect=/\...` vào kênh chat là đủ - nên sửa ngay tại đây thay vì để lại.

## Rủi ro

- **Trang công khai đầu tiên có nội dung thật.** Trước đây người ngoài chỉ thấy một thẻ đăng nhập;
  giờ thấy tên bang chủ, tên quản lý và định hướng. Đây là chủ đích, và bốn cái tên là biệt danh
  trong game, không phải danh tính đời thật. Không đăng Discord ID, không đăng gì hơn những gì bang
  vẫn công khai trong game.
- **Thêm một bề mặt công khai là thêm một bề mặt phải kiểm.** Giảm nhẹ bằng việc trang không nhận
  input, không gọi API, không đọc `searchParams`: nó chỉ đọc phiên để chọn đích cho một cái nút.
- **Ảnh đại diện thiếu thì trang vẫn đúng** nhưng bốn chữ cái đầu trông thô hơn ảnh thật. Chấp nhận:
  đó là trạng thái tạm cho tới khi bang thả ảnh vào.
