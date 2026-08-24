import { API_BASE_URL } from "@/config/api";
import { Button } from "@/components/ui/button";

interface DiscordLoginButtonProps {
  /** Đường dẫn muốn quay lại sau khi đăng nhập xong */
  redirect?: string;
}

/**
 * Nút mở luồng đăng nhập Discord.
 * Là thẻ `a` chứ không phải `fetch`: luồng OAuth là một chuỗi redirect của trình duyệt,
 * bắt đầu bằng một điều hướng thật sang API.
 * @param props.redirect - Đường dẫn quay lại sau khi đăng nhập
 * @returns Nút dẫn sang API để mở OAuth
 */
export function DiscordLoginButton({
  redirect = "/",
}: DiscordLoginButtonProps) {
  const href = `${API_BASE_URL}/auth/discord?redirect=${encodeURIComponent(redirect)}`;

  return (
    <Button size="lg" nativeButton={false} render={<a href={href} />}>
      Đăng nhập bằng Discord
    </Button>
  );
}
