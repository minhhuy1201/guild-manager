import type { ReactNode } from "react";

import { BannerImage } from "@/components/shared/banner-image";
import { OrnamentDivider } from "@/components/shared/ornament-divider";
import { PAGE_BANNERS, type PageBannerKey } from "@/lib/page-banners";

/** Width hint for the banner image: the page shell never grows past 1600px. */
const BANNER_SIZES = "(min-width: 1600px) 1600px, 100vw";

interface PageHeaderProps {
  /** Scene drawn behind the header */
  banner: PageBannerKey;
  /** The page's one `<h1>` */
  title: string;
  /** One sentence under the title saying what the page is for */
  description?: ReactNode;
  /** Controls that act on the whole page, e.g. the team builder's week picker */
  actions?: ReactNode;
}

/**
 * The top of every page: a banner strip with the page's scene, a serif title and an optional
 * description over it, page-wide actions at the bottom right, and the jade-diamond rule closing the
 * block. Two scrims - one rising from the bottom, one from the left - keep white text readable on
 * the night scenes and the daylight ones alike.
 * @param banner - Which page's scene to draw
 * @param title - The page title
 * @param description - Sentence under the title, if any
 * @param actions - Page-wide controls, if any
 * @returns The page header block
 */
export function PageHeader({
  banner,
  title,
  description,
  actions,
}: PageHeaderProps) {
  const { src, objectPosition, tint } = PAGE_BANNERS[banner];

  return (
    <div
      className="relative flex min-h-44 flex-col justify-end overflow-hidden rounded-2xl sm:min-h-56"
      style={{ backgroundColor: tint }}
    >
      <BannerImage
        src={src}
        objectPosition={objectPosition}
        sizes={BANNER_SIZES}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-t from-black/70 via-black/35 to-black/5"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-r from-black/40 to-transparent"
      />

      <div className="relative flex flex-col gap-4 px-5 pt-8 pb-5 sm:px-8 sm:pb-6">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance text-white [text-shadow:0_1px_12px_rgb(0_0_0/0.35)] sm:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="max-w-prose text-sm text-pretty text-white/80">
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
        <OrnamentDivider surface="image" />
      </div>
    </div>
  );
}
