import { PUBLIC_API_URL } from "@/config/api";
import { DiscordIcon } from "@/components/shared/discord-icon";
import { Button } from "@/components/ui/button";

interface DiscordLoginButtonProps {
  /** Path to return to after signing in */
  redirect?: string;
  /**
   * Words on the button. The landing page passes its own: both of its calls to action mean "go and
   * mark attendance", and one intent on a page gets one label whichever route it takes to get there.
   */
  label?: string;
}

/**
 * The button starting the Discord login flow.
 * An `a` tag rather than a `fetch`: the OAuth flow is a browser redirect chain, and it starts with a
 * real navigation to the API.
 * @param props.redirect - Path to return to after signing in
 * @param props.label - Words on the button
 * @returns The link into the API that opens OAuth
 */
export function DiscordLoginButton({
  redirect = "/",
  label = "Đăng nhập bằng Discord",
}: DiscordLoginButtonProps) {
  // The public URL, not `FETCH_API_URL`: this renders on the server, but the browser follows the
  // link, and under the Docker dev profile the server's own URL points at a host only the
  // containers can resolve.
  const href = `${PUBLIC_API_URL}/auth/discord?redirect=${encodeURIComponent(redirect)}`;

  return (
    <Button size="lg" nativeButton={false} render={<a href={href} />}>
      <DiscordIcon />
      {label}
    </Button>
  );
}
