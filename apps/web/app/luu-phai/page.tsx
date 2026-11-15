import { notFound } from "next/navigation";

/**
 * Route /luu-phai - hidden from every role for now: the guild has no use for the class outlook yet.
 * The feature (`@/features/class-survey`) stays in place; to bring the page back, render
 * `<ClassOutlookScreen />` here again and restore its entry in `components/shared/nav-items.ts`.
 * @returns Never - always answers 404
 */
export default function ClassOutlookPage(): never {
  notFound();
}
