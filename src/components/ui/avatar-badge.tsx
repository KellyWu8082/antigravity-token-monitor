"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamMember } from "@/types/nexus";

interface AvatarBadgeProps {
  readonly member: TeamMember;
  readonly size?: "sm" | "md";
  readonly showName?: boolean;
}

export function AvatarBadge({
  member,
  size = "sm",
  showName = false,
}: AvatarBadgeProps) {
  return (
    <div
      className="inline-flex items-center gap-2"
      title={`${member.name} · ${member.role}`}
    >
      <div className="relative inline-flex shrink-0">
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-white/80 dark:ring-slate-900/90",
            member.avatarGradient,
            size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs"
          )}
        >
          {member.initials}
        </div>
        {member.aiCopilotEnabled ? (
          <span
            title="AI Copilot 协同已启用"
            className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-900 text-cyan-300 ring-1 ring-white dark:bg-slate-950 dark:ring-slate-800"
          >
            <Sparkles className="h-2 w-2" aria-hidden="true" />
          </span>
        ) : (
          <span
            className={cn(
              "absolute bottom-0 right-0 h-2 w-2 rounded-full ring-1 ring-white dark:ring-slate-900",
              member.onlineStatus === "online"
                ? "bg-emerald-400"
                : member.onlineStatus === "focus"
                  ? "bg-amber-400"
                  : "bg-slate-400"
            )}
          />
        )}
      </div>

      {showName ? (
        <span className="truncate text-xs font-medium text-zinc-700 dark:text-slate-300">
          {member.name}
        </span>
      ) : null}
    </div>
  );
}

