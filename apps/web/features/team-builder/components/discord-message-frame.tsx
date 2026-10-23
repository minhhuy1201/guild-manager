import type { ReactNode } from "react";
import { ImageIcon } from "lucide-react";

import { GuildSeal } from "@/components/shared/guild-seal";

/** The bot's display name in the preview. */
const BOT_NAME = "Guild Manager";

interface DiscordMessageFrameProps {
  /** Time the message would show, already formatted as `HH:mm` */
  time: string;
  /** File names of the images that would travel with the message, drawn as placeholders */
  attachments: string[];
  /** The message body */
  children: ReactNode;
}

/**
 * A message in a dark Discord-like frame: the bot's seal, its name and time, the body, and a
 * placeholder tile per attached image. The images are placeholders because the real ones are only
 * captured at the moment of sending.
 * @param time - The time shown beside the bot's name
 * @param attachments - File names of the images that would be attached
 * @param children - The message body
 * @returns The framed message
 */
export function DiscordMessageFrame({
  time,
  attachments,
  children,
}: DiscordMessageFrameProps) {
  return (
    <div className="dark flex gap-3 rounded-inner border border-border bg-card p-3 text-foreground">
      <GuildSeal />
      <div className="grid min-w-0 flex-1 gap-1.5">
        <p className="flex items-baseline gap-2">
          <span className="font-semibold">{BOT_NAME}</span>
          <span className="text-sm text-muted-foreground tabular-nums">Hôm nay lúc {time}</span>
        </p>
        {children}
        {attachments.map((name) => (
          <p
            key={name}
            className="flex items-center gap-2 rounded-inner bg-muted/60 px-3 py-6 text-sm text-muted-foreground"
          >
            <ImageIcon className="size-4.5 shrink-0" />
            {name}
          </p>
        ))}
      </div>
    </div>
  );
}
