/** A scene drawn behind a page's header, or behind the whole login page. */
export interface PageImage {
  /** Path under `public/` */
  src: string;
  /**
   * Which part of the picture the crop keeps. Every picture carries the game's logo in one corner;
   * on a wide screen the chosen position crops it out of the banner strip.
   */
  objectPosition: string;
  /** The picture's dominant colour, shown while it loads so the strip never flashes white */
  tint: string;
}

/** The pages that open with a banner. */
export type PageBannerKey = "attendance" | "history" | "teamBuilder" | "settings";

/** Banner of each page - one scene per screen, so a page is recognised before it is read. */
export const PAGE_BANNERS: Record<PageBannerKey, PageImage> = {
  attendance: {
    src: "/img/bg/attendance.jpg",
    objectPosition: "center 40%",
    tint: "#1f2b33",
  },
  history: {
    src: "/img/bg/history.jpg",
    objectPosition: "center 55%",
    tint: "#243a63",
  },
  teamBuilder: {
    src: "/img/bg/team-builder.jpg",
    objectPosition: "center 45%",
    tint: "#6b4a2c",
  },
  settings: {
    src: "/img/bg/settings.jpg",
    objectPosition: "center 62%",
    tint: "#4a7bb5",
  },
};

/** Backdrop of the login page, the one screen a signed-out visitor sees. */
export const LOGIN_BACKDROP: PageImage = {
  src: "/img/bg/login.jpg",
  objectPosition: "center 40%",
  tint: "#cfd6d2",
};
