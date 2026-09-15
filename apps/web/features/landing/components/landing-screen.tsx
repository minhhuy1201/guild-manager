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
 * A fragment rather than a wrapper: each block has to be a direct child of the layout's `<main>` to
 * inherit the staggered `page-enter` already defined in `globals.css`. Wrapping them in a `<div>`
 * would animate the whole page as one lump.
 * @param isSignedIn - Whether the visitor already has a session
 * @returns The five blocks of the landing page
 */
export function LandingScreen({ isSignedIn }: LandingScreenProps) {
  return (
    <>
      <LandingHero isSignedIn={isSignedIn} />
      <GuildPillars />
      <LeadershipSection />
      <JoinSteps />
      <AttendanceInvite isSignedIn={isSignedIn} />
    </>
  );
}
