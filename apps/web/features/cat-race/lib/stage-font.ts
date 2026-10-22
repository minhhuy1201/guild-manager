import { Bungee } from "next/font/google";

/**
 * The stage lettering ("ĐÍCH", "ĐUA MÈO", banners, the winner card). Loaded here, not in the root
 * layout, so only the cat race page downloads it; `variable` goes on the stage root and
 * `style.fontFamily` is the real family name a canvas needs.
 */
export const stageFont = Bungee({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: "400",
  display: "swap",
  variable: "--font-bungee",
});
