import {
  CalendarCheck,
  ClipboardCheck,
  MessageCircle,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Everything the landing page says about the guild, as constants rather than data from the API.
 *
 * Four names and one sentence about the season's goal change a few times a year; an endpoint, a
 * table, a shared schema and an admin screen to avoid editing this file once a quarter is the wrong
 * price. Revisit it the day the guild wants to edit the page without a deploy.
 */

/** One person in the guild's leadership, as the landing page introduces them. */
export interface GuildLeader {
  /** In-game name, the only identity the page publishes */
  name: string;
  /** What the guild calls their post */
  role: string;
  /** One line saying what this person actually looks after */
  duty: string;
  /**
   * Where their picture goes. The file may not exist yet: the avatar falls back to `initials` until
   * someone drops a PNG at this exact path.
   */
  avatarSrc: string;
  /** Letters drawn in place of a missing picture */
  initials: string;
}

/** The guild's leadership, in the order the page introduces them - the guild master opens. */
export const GUILD_LEADERS: readonly GuildLeader[] = [
  {
    name: "LightAries",
    role: "Bang chủ",
    duty: "Chốt định hướng mùa giải và quyết cuối trong mọi trận lớn.",
    avatarSrc: "/img/members/lightaries.png",
    initials: "LA",
  },
  {
    name: "Leonie",
    role: "Leader",
    duty: "Cầm quân trong trận, gọi mục tiêu và điều nhịp giao tranh.",
    avatarSrc: "/img/members/leonie.png",
    initials: "LE",
  },
  {
    name: "huy",
    role: "Quản lý",
    duty: "Giữ lịch đánh, đội hình và số liệu điểm danh hằng tuần.",
    avatarSrc: "/img/members/huy.png",
    initials: "HU",
  },
  {
    name: "spygutie",
    role: "Quản lý",
    duty: "Lo nhân sự, nhận người mới và giữ kỷ luật trong bang.",
    avatarSrc: "/img/members/spygutie.png",
    initials: "SP",
  },
];

/** One of the three things the guild wants a visitor to know before anything else. */
export interface GuildPillar {
  /** Short heading */
  title: string;
  /** Two sentences at most */
  body: string;
  /** Mark shown beside the heading */
  icon: LucideIcon;
}

/** The guild's three pillars, in the order the bento reads them: big cell first. */
export const GUILD_PILLARS: readonly GuildPillar[] = [
  {
    title: "Bang hard PVP",
    body: "Mèo Mập Giang Hồ đánh là đánh thật. Bang đi đủ mặt các trận lớn trong tuần, tập đội hình và mổ lại trận thua chứ không lên chỉ để điểm mặt.",
    icon: Swords,
  },
  {
    title: "Mục tiêu bảng A",
    body: "Cả mùa này bang nhắm một chỗ trong bảng A, và mọi thứ còn lại xếp sau mục tiêu đó.",
    icon: Trophy,
  },
  {
    title: "Điểm danh là kỷ luật",
    body: "Ai đi, ai nghỉ đều phải báo trước hạn. Ban chỉ huy cần con số thật để xếp được đội hình thật.",
    icon: ClipboardCheck,
  },
];

/** One step of what joining the guild looks like from the outside. */
export interface JoinStep {
  /** A verb, not a stage number */
  title: string;
  /** One line */
  body: string;
  /** Mark shown in the step's seal */
  icon: LucideIcon;
}

/** How someone goes from reading this page to standing in a formation. */
export const JOIN_STEPS: readonly JoinStep[] = [
  {
    title: "Nhắn cho ban chỉ huy",
    body: "Tìm một trong bốn người ở trên trong game hoặc trên Discord của bang để nói chuyện trước.",
    icon: MessageCircle,
  },
  {
    title: "Điểm danh trong tuần",
    body: "Vào trang điểm danh bằng tài khoản Discord, chọn Có hoặc Không cho từng trận trước hạn.",
    icon: CalendarCheck,
  },
  {
    title: "Nhận vị trí trong đội hình",
    body: "Quản lý xếp team theo đúng những người đã báo đi, rồi đội hình được thông báo lại trên Discord.",
    icon: Users,
  },
];
