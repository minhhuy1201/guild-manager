"use client";

import { useState } from "react";
import { formatVnTime } from "@guild/shared/lib";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SAMPLE_MATCH,
  SAMPLE_TEAM,
  previewChannelContent,
  previewDirectMessageContent,
} from "../lib/discord-preview";
import type { PreviewSession } from "../lib/discord-preview";
import { DiscordMessageContent } from "./discord-message-content";
import { DiscordMessageFrame } from "./discord-message-frame";

type PreviewTab = "channel" | "direct";

/** A panel fades in when its tab is picked: opacity only, on the app's show/hide duration. */
const PANEL_FADE = "animate-in fade-in-0 duration-[var(--duration-base)]";

interface AnnouncePreviewProps {
  /** The battle day being announced */
  session: PreviewSession;
  /** How many line-up images the announcement will carry, one per match */
  imageCount: number;
  /** The Announcement note typed so far, empty when there is none */
  note: string;
  /** Whether each placed member gets a direct message, which decides the second tab */
  notifyMembers: boolean;
  /** Extra classes for the wrapper */
  className?: string;
}

/**
 * What the send will post: the channel message and, while direct messages are on, a sample of the
 * one each member gets. The text comes from the same functions the API sends with, so the preview
 * cannot say something the message does not.
 * @param session - The battle day being announced
 * @param imageCount - Line-up images the announcement carries
 * @param note - The Announcement note typed so far
 * @param notifyMembers - Whether the direct-message tab exists
 * @param className - Extra classes for the wrapper
 * @returns The tabbed preview
 */
export function AnnouncePreview({
  session,
  imageCount,
  note,
  notifyMembers,
  className,
}: AnnouncePreviewProps) {
  const [tab, setTab] = useState<PreviewTab>("channel");
  // Mounted with the dialog's content, so this is the moment the admin opened it.
  const [now] = useState(() => new Date());
  // Turning direct messages off while their tab is open falls back to the channel.
  const activeTab = notifyMembers ? tab : "channel";
  const noteOrNull = note.trim() === "" ? null : note.trim();
  const time = formatVnTime(now);

  return (
    <section aria-label="Xem trước tin Discord" className={className}>
      <Tabs value={activeTab} onValueChange={(value) => setTab(value as PreviewTab)}>
        <TabsList>
          <TabsTrigger value="channel">Kênh bang chiến</TabsTrigger>
          {notifyMembers ? <TabsTrigger value="direct">Nhắn riêng (mẫu)</TabsTrigger> : null}
        </TabsList>
        <div className="max-h-80 overflow-y-auto lg:max-h-none">
          <TabsContent value="channel" className={PANEL_FADE}>
            <DiscordMessageFrame
              time={time}
              attachments={Array.from({ length: imageCount }, (_, index) => `doi-hinh-${index + 1}.webp`)}
            >
              <DiscordMessageContent content={previewChannelContent(session, noteOrNull, now)} />
            </DiscordMessageFrame>
          </TabsContent>
          <TabsContent value="direct" className={PANEL_FADE}>
            <DiscordMessageFrame
              time={time}
              attachments={[`team-${SAMPLE_TEAM}-tran-${SAMPLE_MATCH}.webp`]}
            >
              <DiscordMessageContent content={previewDirectMessageContent(session, noteOrNull)} />
            </DiscordMessageFrame>
          </TabsContent>
        </div>
      </Tabs>
    </section>
  );
}
