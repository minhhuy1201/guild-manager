import type { TacticTokenSize } from "@guild/shared/enums";
import type { TacticElement } from "@guild/shared/schemas";

/**
 * The size of every token in a selection, in selection order; other kinds of element are skipped.
 * @param elements - The selected elements
 * @returns One size per selected token
 */
export function selectedTokenSizes(
  elements: readonly TacticElement[]
): TacticTokenSize[] {
  return elements.flatMap((element) =>
    element.kind === "token" ? [element.size] : []
  );
}

/**
 * The size the size group shows as pressed: the selected tokens' own when they share one, none
 * when they are mixed, and the size new tokens take when no token is selected.
 * @param tokenSize - Size every new token takes
 * @param sizes - Size of every selected token
 * @returns The pressed size, or null for a mixed selection
 */
export function pressedTokenSize(
  tokenSize: TacticTokenSize,
  sizes: readonly TacticTokenSize[]
): TacticTokenSize | null {
  const [first] = sizes;

  if (first === undefined) {
    return tokenSize;
  }

  return sizes.every((size) => size === first) ? first : null;
}
