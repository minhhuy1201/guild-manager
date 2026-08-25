import { API_BASE_URL } from "@/config/api";
import { Button } from "@/components/ui/button";

interface DiscordLoginButtonProps {
  /** Path to return to after signing in */
  redirect?: string;
}

/**
 * The button starting the Discord login flow.
 * An `a` tag rather than a `fetch`: the OAuth flow is a browser redirect chain, and it starts with a
 * real navigation to the API.
 * @param props.redirect - Path to return to after signing in
 * @returns The link into the API that opens OAuth
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
