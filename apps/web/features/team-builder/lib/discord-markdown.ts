/** One line-level block of a Discord message. */
export type DiscordBlock =
  | { kind: "heading"; level: 1 | 2; text: string }
  | { kind: "quote"; lines: string[] }
  | { kind: "rule" }
  | { kind: "text"; text: string };

/** One inline run: plain text, bold, italic or a mention token. */
export type DiscordInline =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "mention"; token: string };

/** The dashes the announcement draws above its role mention. */
const RULE = /^-{10,}$/;

/** Splits a line into the inline runs below, keeping the delimiters so they can be told apart. */
const INLINE_TOKEN = /(<[#@&][^>\s]+>|\*\*[^*]+\*\*|\*[^*]+\*)/;

/**
 * Split message content into the blocks Discord draws: `#` and `##` headings, a run of `>` lines
 * as one quote, a rule of dashes, and plain lines. The subset the line-up messages use, no more.
 * @param content - The message text
 * @returns The blocks, in order
 */
export function parseDiscordBlocks(content: string): DiscordBlock[] {
  const blocks: DiscordBlock[] = [];

  for (const line of content.split("\n")) {
    const last = blocks[blocks.length - 1];

    if (line.startsWith(">")) {
      const text = line.replace(/^> ?/, "");

      if (last?.kind === "quote") {
        blocks[blocks.length - 1] = { kind: "quote", lines: [...last.lines, text] };
      } else {
        blocks.push({ kind: "quote", lines: [text] });
      }
    } else if (line.startsWith("## ")) {
      blocks.push({ kind: "heading", level: 2, text: line.slice(3) });
    } else if (line.startsWith("# ")) {
      blocks.push({ kind: "heading", level: 1, text: line.slice(2) });
    } else if (RULE.test(line)) {
      blocks.push({ kind: "rule" });
    } else {
      blocks.push({ kind: "text", text: line });
    }
  }

  return blocks;
}

/**
 * Split one line into plain, bold, italic and mention runs.
 * @param text - A line without its block marker
 * @returns The runs, in order, with empty ones dropped
 */
export function parseDiscordInline(text: string): DiscordInline[] {
  return text
    .split(INLINE_TOKEN)
    .filter((part) => part !== "")
    .map((part): DiscordInline => {
      if (part.startsWith("<")) return { kind: "mention", token: part };
      if (part.startsWith("**")) return { kind: "bold", text: part.slice(2, -2) };
      if (part.startsWith("*")) return { kind: "italic", text: part.slice(1, -1) };

      return { kind: "text", text: part };
    });
}
