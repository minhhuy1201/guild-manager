import type { CSSProperties, ReactNode } from "react";

import { BannerImage } from "@/components/shared/banner-image";
import { OrnamentDivider } from "@/components/shared/ornament-divider";
import { APP_SHELL_WIDTH_PX } from "@/lib/layout";
import { PAGE_BANNERS, type PageBannerKey } from "@/lib/page-banners";
import { cn } from "@/lib/utils";

/** Width hint for the banner image: the page shell never grows past `APP_SHELL_WIDTH_PX`. */
const BANNER_SIZES = `(min-width: ${APP_SHELL_WIDTH_PX}px) ${APP_SHELL_WIDTH_PX}px, 100vw`;

interface PageHeaderProps {
  /** Scene drawn behind the header */
  banner: PageBannerKey;
  /** The page's one `<h1>` */
  title: string;
  /** One sentence under the title saying what the page is for */
  description?: ReactNode;
  /** Controls that act on the whole page, e.g. the team builder's week picker */
  actions?: ReactNode;
  /** Below `sm`, drop the scene and show title and description as plain text on the page */
  isPlainOnPhone?: boolean;
}

/**
 * The top of every page: a banner strip with the page's scene, a serif title and an optional
 * description over it, page-wide actions at the bottom right, and the jade-diamond rule closing the
 * block. Two scrims - one rising from the bottom, one from the left - keep white text readable on
 * the night scenes and the daylight ones alike. `isPlainOnPhone` (attendance and its history)
 * gives a phone the text alone, since the strip would spend its screen on decoration.
 * @param banner - Which page's scene to draw
 * @param title - The page title
 * @param description - Sentence under the title, if any
 * @param actions - Page-wide controls, if any
 * @param isPlainOnPhone - Whether a phone gets plain text instead of the scene
 * @returns The page header block
 */
export function PageHeader({
  banner,
  title,
  description,
  actions,
  isPlainOnPhone = false,
}: PageHeaderProps) {
  const { src, objectPosition, tint } = PAGE_BANNERS[banner];
  // Everything that belongs to the scene, so one flag drops it all on a phone.
  const sceneClass = isPlainOnPhone ? "max-sm:hidden" : undefined;

  return (
    <div
      className={cn(
        "relative flex min-h-24 flex-col justify-end overflow-hidden rounded-2xl bg-(--banner-tint) sm:min-h-28",
        isPlainOnPhone && "max-sm:min-h-0 max-sm:bg-transparent"
      )}
      style={{ "--banner-tint": tint } as CSSProperties}
    >
      <div aria-hidden className={cn("absolute inset-0", sceneClass)}>
        <BannerImage
          src={src}
          objectPosition={objectPosition}
          sizes={BANNER_SIZES}
        />
      </div>
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 bg-linear-to-t from-black/70 via-black/35 to-black/5",
          sceneClass
        )}
      />
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 bg-linear-to-r from-black/40 to-transparent",
          sceneClass
        )}
      />

      <div
        className={cn(
          "relative flex flex-col gap-3 px-5 pt-4 pb-3 sm:px-8",
          isPlainOnPhone && "max-sm:px-0"
        )}
      >
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1
              className={cn(
                "font-heading text-2xl font-semibold tracking-tight text-balance text-white [text-shadow:0_1px_12px_rgb(0_0_0/0.35)] sm:text-3xl",
                isPlainOnPhone &&
                  "max-sm:text-foreground max-sm:[text-shadow:none]"
              )}
            >
              {title}
            </h1>
            {description && (
              <p
                className={cn(
                  "max-w-prose text-sm text-pretty text-white/80",
                  isPlainOnPhone && "max-sm:text-muted-foreground"
                )}
              >
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </div>
        <OrnamentDivider surface="image" className={sceneClass} />
      </div>
    </div>
  );
}
