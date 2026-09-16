import Link from "next/link";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";

/**
 * The header's one action for a visitor: the way in.
 *
 * Filled jade rather than the outline every other header control wears. A signed-out visitor has
 * exactly one thing to press, and the app's own accent - the colour of the seal beside it and of
 * the current page in the nav - is what says so; navy `primary` is the working colour of the
 * screens behind the login, and an outline button here reads as one more piece of furniture.
 *
 * A gold sheen crosses it once on hover, gold being the palette's highlight and already the login
 * card's one ornament. The sheen is the only thing that moves: the geometry is untouched
 * (frontend.md §6, Motion) and the press comes from the button's own `active:translate-y-px`.
 *
 * `ease-linear` and not the app's `ease-out-soft`, the one place that deviates: a shine reads as a
 * light source passing over the surface, and `ease-out-soft` spends three quarters of the travel in
 * the first 40ms - the band is off the far edge before the eye catches it.
 * @returns The header's login button
 */
export function HeaderLoginButton() {
  return (
    <Button
      size="sm"
      nativeButton={false}
      render={<Link href={ROUTES.login} />}
      className="relative overflow-hidden bg-jade text-jade-foreground hover:bg-[color-mix(in_oklch,var(--jade),var(--foreground)_12%)]"
    >
      {/* Parked one width to the left, so it only ever enters from outside the button. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-linear-to-r from-transparent via-gold/70 to-transparent transition-transform duration-[var(--duration-slow)] ease-linear group-hover/button:translate-x-[400%]"
      />
      <LogIn className="relative" />
      <span className="relative">Đăng nhập</span>
    </Button>
  );
}
