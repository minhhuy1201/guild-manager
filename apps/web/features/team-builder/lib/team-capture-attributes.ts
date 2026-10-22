/**
 * Marks a team card the Team notice screenshots, with the stored match number (1-based, like the
 * API's `matchIndex`) and the team number. Only a card with someone placed in it carries these:
 * an empty team has nobody to message, so it costs no capture and no payload.
 */
export const TEAM_CAPTURE_MATCH_ATTRIBUTE = "data-team-capture-match";

/** The team number of a card marked with `TEAM_CAPTURE_MATCH_ATTRIBUTE`. */
export const TEAM_CAPTURE_TEAM_ATTRIBUTE = "data-team-capture-team";

/**
 * Space-separated ids of the members standing in a marked card. A retry captures only the cards
 * holding someone who was not messaged, and the document is the one place that knows which card
 * that is.
 */
export const TEAM_CAPTURE_MEMBERS_ATTRIBUTE = "data-team-capture-members";
