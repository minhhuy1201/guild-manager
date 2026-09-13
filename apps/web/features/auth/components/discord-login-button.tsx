import { PUBLIC_API_URL } from "@/config/api";
import { DiscordIcon } from "@/components/shared/discord-icon";
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
  // The public URL, not `API_BASE_URL`: this renders on the server, but the browser follows the
  // link, and under the Docker dev profile the server's own URL points at a host only the
  // containers can resolve.
  const href = `${PUBLIC_API_URL}/auth/discord?redirect=${encodeURIComponent(redirect)}`;

  return (
    <Button size="lg" nativeButton={false} render={<a href={href} />}>
      <DiscordIcon />
      Đăng nhập bằng Discord
    </Button>
  );
}
