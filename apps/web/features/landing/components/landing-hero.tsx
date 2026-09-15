import { BannerImage } from "@/components/shared/banner-image";
import { GuildSeal } from "@/components/shared/guild-seal";
import { LANDING_HERO } from "@/lib/page-banners";

import { AttendanceCta } from "./attendance-cta";

/** Width hint for the hero image: the page shell never grows past 1600px. */
const HERO_SIZES = "(min-width: 1600px) 1600px, 100vw";

interface LandingHeroProps {
  /** Whether the visitor already has a session */
  isSignedIn: boolean;
}

/**
 * The landing page's opening: the guild's scene, its name and what it plays for.
 *
 * Four pieces of text and no more - the seal with the game's name, the title, one sentence, the
 * button. Everything else a visitor might want (who runs the guild, how to join) has a block of its
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
      className="relative flex min-h-[72svh] flex-col justify-end overflow-hidden rounded-2xl"
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

      <div className="relative flex max-w-2xl flex-col items-start gap-5 px-5 pt-20 pb-10 sm:px-10 sm:pb-14">
        <div className="flex items-center gap-3">
          <GuildSeal size="lg" />
          {/* `lang` so the browser picks a Chinese face for the glyphs rather than a Vietnamese one. */}
          <span lang="zh" className="text-xs tracking-[0.3em] text-white/70">
            逆水寒
          </span>
        </div>
        <h1 className="font-heading text-4xl leading-tight font-semibold tracking-tight text-balance text-white [text-shadow:0_2px_16px_rgb(0_0_0/0.45)] sm:text-5xl">
          Mèo Mập Giang Hồ
        </h1>
        <p className="max-w-lg text-base text-pretty text-white/85 sm:text-lg">
          Bang hard PVP của Nghịch Thuỷ Hàn. Mùa này bang nhắm một chỗ trong
          bảng A.
        </p>
        <AttendanceCta isSignedIn={isSignedIn} />
      </div>
    </section>
  );
}
