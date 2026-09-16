import { ScrollReveal } from "@/components/shared/scroll-reveal";

import { AttendanceInvite } from "./attendance-invite";
import { GuildPillars } from "./guild-pillars";
import { JoinSteps } from "./join-steps";
import { LandingHero } from "./landing-hero";
import { LeadershipSection } from "./leadership-section";

interface LandingScreenProps {
  /** Whether the visitor already has a session */
  isSignedIn: boolean;
}

/**
 * The guild's public page, five blocks deep: what the guild is, who runs it, how to join, and the
 * one thing it wants a visitor to do.
 *
 * A fragment rather than a wrapper: each block has to be a direct child of the layout's `<main>`,
 * either to inherit the staggered `page-enter` defined in `globals.css` - the hero does - or,
 * below it, to take that place through its `ScrollReveal`. Wrapping them all in a `<div>` would
 * animate the whole page as one lump.
 *
 * Only the hero is on screen when the page loads, so only the hero arrives with the page. The four
 * blocks under it wait for the fold and play the same entrance as they are scrolled to: on a page
 * this tall the visitor would otherwise scroll into four blocks that had already finished arriving.
 * @param isSignedIn - Whether the visitor already has a session
 * @returns The five blocks of the landing page
 */
export function LandingScreen({ isSignedIn }: LandingScreenProps) {
  return (
    <>
      <LandingHero isSignedIn={isSignedIn} />
      <ScrollReveal>
        <GuildPillars />
      </ScrollReveal>
      <ScrollReveal>
        <LeadershipSection />
      </ScrollReveal>
      <ScrollReveal>
        <JoinSteps />
      </ScrollReveal>
      <ScrollReveal>
        <AttendanceInvite isSignedIn={isSignedIn} />
      </ScrollReveal>
    </>
  );
}
