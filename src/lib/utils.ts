import type { TaskPriority, TaskStatus, TeamMember } from "@/types/nexus";

export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(" ");
}

export interface PriorityStyleMeta {
  readonly label: string;
  readonly shortLabel: string;
  readonly badgeClass: string;
  readonly dotClass: string;
  readonly weight: number;
}

export const PRIORITY_META: Record<TaskPriority, PriorityStyleMeta> = {
  urgent: {
    label: "紧急 · Urgent",
    shortLabel: "紧急",
    badgeClass:
      "bg-gradient-to-r from-rose-500/15 via-orange-500/12 to-amber-500/10 text-rose-600 dark:text-rose-300 border-rose-500/25 dark:border-rose-400/25",
    dotClass: "bg-rose-500",
    weight: 4,
  },
  high: {
    label: "高优先级 · High",
    shortLabel: "高",
    badgeClass:
      "bg-gradient-to-r from-amber-500/15 via-orange-400/12 to-yellow-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25 dark:border-amber-400/25",
    dotClass: "bg-amber-500",
    weight: 3,
  },
  medium: {
    label: "中优先级 · Medium",
    shortLabel: "中",
    badgeClass:
      "bg-gradient-to-r from-indigo-500/15 via-violet-500/10 to-cyan-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25 dark:border-indigo-400/25",
    dotClass: "bg-indigo-500",
    weight: 2,
  },
  low: {
    label: "低优先级 · Low",
    shortLabel: "低",
    badgeClass:
      "bg-gradient-to-r from-slate-500/12 via-zinc-500/10 to-emerald-500/10 text-slate-600 dark:text-slate-300 border-slate-400/25 dark:border-white/10",
    dotClass: "bg-slate-400",
    weight: 1,
  },
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "待处理",
  in_progress: "进行中",
  in_review: "已审核",
  done: "已完成",
};

export function findMemberById(
  members: readonly TeamMember[],
  id: string
): TeamMember {
  const found = members.find((member) => member.id === id);
  if (found) return found;
  const fallback = members[0];
  if (fallback) return fallback;
  return {
    id: "usr-ai",
    name: "Nexus AI",
    initials: "AI",
    role: "Copilot",
    avatarGradient: "from-indigo-500 to-cyan-400",
    aiCopilotEnabled: true,
    onlineStatus: "online",
  };
}

export function formatRelativeTime(isoString: string): string {
  const parsed = Date.parse(isoString);
  if (Number.isNaN(parsed)) return "刚刚";
  const diffMinutes = Math.max(0, Math.floor((Date.now() - parsed) / 60000));
  if (diffMinutes < 1) return "刚刚";
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} 天前`;
}

