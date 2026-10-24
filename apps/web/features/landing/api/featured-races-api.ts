import type { FeaturedRace } from "@guild/shared/schemas";

import { apiFetch } from "@/lib/api-client";

/**
 * The Featured races for the landing page's Bảng vàng, read without a session.
 *
 * Never throws: the block is secondary, and a visitor must not meet a broken public page because
 * this one call failed. The failure is logged on the server and the page renders without the block.
 * `no-store` because the admin's switch has to show on the next load, and Next would otherwise be
 * free to cache a fetch made during render.
 * @returns The races newest first, or an empty list when the API cannot answer
 */
export async function loadFeaturedRaces(): Promise<FeaturedRace[]> {
  try {
    return await apiFetch<FeaturedRace[]>("/public/featured-races", {
      cache: "no-store",
    });
  } catch (error) {
    console.error("Không tải được Bảng vàng cho trang chủ.", error);

    return [];
  }
}
