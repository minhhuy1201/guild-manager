import { PREVIEW_MENTION_LABELS } from "../lib/discord-preview";
import { parseDiscordBlocks, parseDiscordInline } from "../lib/discord-markdown";

interface DiscordInlineTextProps {
  /** One line without its block marker */
  text: string;
}

/**
 * One line with its bold, italic and mention runs drawn.
 * @param text - The line
 * @returns The runs as inline elements
 */
function DiscordInlineText({ text }: DiscordInlineTextProps) {
  return parseDiscordInline(text).map((run, index) => {
    switch (run.kind) {
      case "bold":
        return <strong key={index}>{run.text}</strong>;
      case "italic":
        return <em key={index}>{run.text}</em>;
      case "mention":
        return (
          <span
            key={index}
            className="rounded-sm bg-primary/15 px-1 font-medium text-primary"
          >
            {PREVIEW_MENTION_LABELS[run.token] ?? run.token}
          </span>
        );
      case "text":
        return <span key={index}>{run.text}</span>;
    }
  });
}

interface DiscordMessageContentProps {
  /** The message text, in the subset of Discord markdown the line-up messages use */
  content: string;
}

/**
 * Draw message text the way Discord's client does: headings, a quote with a bar on its left, a
 * rule, and mentions as pills.
 * @param content - The message text
 * @returns The blocks of the message
 */
export function DiscordMessageContent({ content }: DiscordMessageContentProps) {
  return (
    <div className="grid gap-1 text-base break-words">
      {parseDiscordBlocks(content).map((block, index) => {
        switch (block.kind) {
          case "heading":
            return (
              <p
                key={index}
                className={block.level === 1 ? "text-xl font-bold" : "text-lg font-semibold"}
              >
                <DiscordInlineText text={block.text} />
              </p>
            );
          case "quote":
            return (
              <blockquote
                key={index}
                className="grid gap-0.5 border-l-4 border-muted-foreground/40 pl-3"
              >
                {block.lines.map((line, lineIndex) => (
                  <p key={lineIndex} className="min-h-[1lh]">
                    <DiscordInlineText text={line} />
                  </p>
                ))}
              </blockquote>
            );
          case "rule":
            return <hr key={index} className="my-1 border-border" />;
          case "text":
            return (
              <p key={index}>
                <DiscordInlineText text={block.text} />
              </p>
            );
        }
      })}
    </div>
  );
}
