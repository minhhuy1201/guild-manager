/**
 * Transition type for a navigation the user chose (nav link, brand mark, "back" link). The layout's
 * `<ViewTransition>` fades the page only for this type, so refreshes, tab switches and Suspense
 * reveals stay still.
 */
export const PAGE_NAV_TRANSITION = ["page-nav"];
