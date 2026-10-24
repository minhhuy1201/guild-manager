import { BannerImage } from "@/components/shared/banner-image";
import { GuildSeal } from "@/components/shared/guild-seal";
import { OrnamentDivider } from "@/components/shared/ornament-divider";
import { APP_SHELL_WIDTH_PX } from "@/lib/layout";
import { LANDING_HERO } from "@/lib/page-banners";

import { AttendanceCta } from "./attendance-cta";

/** Ties the section to its heading, so the region carries a name. */
const HERO_HEADING_ID = "gioi-thieu-tieu-de";

/** Width hint for the hero image: the page shell never grows past `APP_SHELL_WIDTH_PX`. */
const HERO_SIZES = `(min-width: ${APP_SHELL_WIDTH_PX}px) ${APP_SHELL_WIDTH_PX}px, 100vw`;

interface LandingHeroProps {
  /** Whether the visitor already has a session */
  isSignedIn: boolean;
}

/**
 * The landing page's opening: the guild's scene, its name and what it plays for.
 *
 * Four pieces of text and no more - the seal with the game's name, the title, one sentence, the
 * button, set large so the opening is the loudest thing on the page. Everything else a visitor might want (who runs the guild, how to join) has a block of its
 * own further down; crowding it in here is what turns an opening into a leaflet.
 *
 * `svh` rather than `vh`: on a phone `100vh` counts the address bar that is not there, so the button
 * ends up below the fold on the one screen that has to show it.
 * @param isSignedIn - Whether the visitor already has a session
 * @returns The hero block
 */
export function LandingHero({ isSignedIn }: LandingHeroProps) {
  return (
    <section
      aria-labelledby={HERO_HEADING_ID}
      className="relative flex min-h-[86svh] flex-col justify-end overflow-hidden rounded-container shadow-md"
      style={{ backgroundColor: LANDING_HERO.tint }}
    >
      <BannerImage
        src={LANDING_HERO.src}
        objectPosition={LANDING_HERO.objectPosition}
        sizes={HERO_SIZES}
      />
      {/* The same two scrims `PageHeader` uses, for the same reason: white text has to read on a
          night scene and a daylight one alike. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-t from-black/75 via-black/40 to-black/10"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-r from-black/50 to-transparent"
      />

      <div className="relative flex max-w-4xl flex-col items-start gap-6 px-5 pt-24 pb-12 sm:px-12 sm:pb-20">
        <div className="flex items-center gap-4">
          <GuildSeal size="xl" />
          {/* `lang` so the browser picks a Chinese face for the glyphs rather than a Vietnamese one. */}
          <span lang="zh" className="text-sm tracking-[0.4em] text-white/75">
            逆水寒
          </span>
        </div>
        <OrnamentDivider surface="image" stroke="brush" className="w-40 sm:w-56" />
        <h1
          id={HERO_HEADING_ID}
          className="font-heading text-5xl leading-[1.02] font-semibold tracking-tight text-balance text-white [text-shadow:0_2px_24px_rgb(0_0_0/0.55)] sm:text-7xl lg:text-8xl"
        >
          Mèo Mập Giang Hồ
        </h1>
        <p className="max-w-xl text-lg text-pretty text-white/90 sm:text-xl">
          Bang hard PVP của Nghịch Thuỷ Hàn. Mùa này bang nhắm một chỗ trong
          bảng A.
        </p>
        <AttendanceCta isSignedIn={isSignedIn} />
      </div>
    </section>
  );
}
