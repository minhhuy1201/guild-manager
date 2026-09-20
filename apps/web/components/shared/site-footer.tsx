import { APP_SHELL_WIDTH } from "@/lib/layout";
import { cn } from "@/lib/utils";

/**
 * The app's footer: credits the game artwork behind the page banners and the login page, and says
 * the site is an unofficial, non-commercial guild page. It sits in the root layout, so the one page
 * a visitor sees without signing in carries it too.
 * @returns The footer
 */
export function SiteFooter() {
  return (
    <footer
      className={cn("mx-auto mt-auto w-full px-4 pb-6 sm:px-6", APP_SHELL_WIDTH)}
    >
      <p className="text-center text-xs text-pretty text-muted-foreground">
        Hình ảnh: © NetEase, Nghịch Thuỷ Hàn. Trang phi thương mại của bang Mèo
        Mập Giang Hồ, không liên kết với NetEase.
      </p>
    </footer>
  );
}
