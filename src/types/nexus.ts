export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";

export type TaskPriority = "urgent" | "high" | "medium" | "low";

export type ViewMode = "kanban" | "list";

export type AppSection = "workspace" | "analytics";

export type ThemePreference = "system" | "light" | "dark";

export type ResolvedTheme = "light" | "dark";

export type AnalyticsTimeframe = "7d" | "14d" | "30d";

export interface TeamMember {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly role: string;
  readonly avatarGradient: string;
  readonly aiCopilotEnabled: boolean;
  readonly onlineStatus: "online" | "focus" | "offline";
}

export interface TaskSubtask {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
}

export interface NexusTask {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly assigneeId: string;
  readonly tags: readonly string[];
  readonly aiProgress: number; // 0 - 100
  readonly aiConfidence: number; // 0 - 100
  readonly aiEstimateLabel: string;
  readonly aiSyncing?: boolean;
  readonly storyPoints: number;
  readonly updatedAt: string;
  readonly order: number;
  readonly subtasks: readonly TaskSubtask[];
}

export interface KanbanColumnMeta {
  readonly id: TaskStatus;
  readonly title: string;
  readonly subtitle: string;
  readonly accentClass: string;
  readonly dotClass: string;
}

export interface ProductivityPoint {
  readonly label: string;
  readonly actualPoints: number;
  readonly aiProjectedPoints: number;
  readonly completedTasks: number;
  readonly aiAdoptionPct: number;
}

export interface AiCategoryBreakdown {
  readonly id: string;
  readonly category: string;
  readonly adoptionRate: number;
  readonly speedupFactor: string;
  readonly acceptedSuggestions: number;
}

export interface ActivityEvent {
  readonly id: string;
  readonly timestampLabel: string;
  readonly actorName: string;
  readonly actorInitials: string;
  readonly actorGradient: string;
  readonly isAiAgent: boolean;
  readonly actionText: string;
  readonly targetCode?: string;
  readonly category: "ai" | "status" | "code" | "command";
}

export interface AnalyticsSnapshot {
  readonly timeframe: AnalyticsTimeframe;
  readonly weeklyVelocity: number;
  readonly velocityDelta: string;
  readonly aiCodeAdoptionRate: number;
  readonly aiAdoptionDelta: string;
  readonly avgCycleHours: number;
  readonly cycleTimeDelta: string;
  readonly hoursSavedByAi: number;
  readonly hoursSavedDelta: string;
  readonly productivitySeries: readonly ProductivityPoint[];
  readonly categoryBreakdown: readonly AiCategoryBreakdown[];
}

export interface CreateTaskPayload {
  readonly title: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly assigneeId: string;
  readonly tags: readonly string[];
  readonly storyPoints: number;
}

export interface MoveTaskPayload {
  readonly taskId: string;
  readonly targetStatus: TaskStatus;
  readonly targetIndex: number;
}

export interface BatchMoveTasksPayload {
  readonly taskIds: readonly string[];
  readonly targetStatus: TaskStatus;
  readonly commandLabel: string;
}

export interface UpdateTaskPayload {
  readonly taskId: string;
  readonly patch: Partial<
    Pick<
      NexusTask,
      | "title"
      | "description"
      | "status"
      | "priority"
      | "assigneeId"
      | "aiProgress"
      | "aiEstimateLabel"
      | "subtasks"
      | "tags"
    >
  >;
}

export interface TaskFilterState {
  readonly search: string;
  readonly priority: TaskPriority | "all";
  readonly assigneeId: string | "all";
}

export type ParsedAiIntent =
  | {
      readonly kind: "batch_move";
      readonly id: string;
      readonly title: string;
      readonly subtitle: string;
      readonly targetStatus: TaskStatus;
      readonly matchedTaskIds: readonly string[];
      readonly matchedCodes: readonly string[];
    }
  | {
      readonly kind: "set_priority";
      readonly id: string;
      readonly title: string;
      readonly subtitle: string;
      readonly targetPriority: TaskPriority;
      readonly matchedTaskIds: readonly string[];
      readonly matchedCodes: readonly string[];
    }
  | {
      readonly kind: "create_task";
      readonly id: string;
      readonly title: string;
      readonly subtitle: string;
      readonly taskTitle: string;
      readonly priority: TaskPriority;
      readonly status: TaskStatus;
    }
  | {
      readonly kind: "switch_section";
      readonly id: string;
      readonly title: string;
      readonly subtitle: string;
      readonly section: AppSection;
      readonly viewMode?: ViewMode;
    }
  | {
      readonly kind: "set_theme";
      readonly id: string;
      readonly title: string;
      readonly subtitle: string;
      readonly theme: ThemePreference;
    }
  | {
      readonly kind: "filter_priority";
      readonly id: string;
      readonly title: string;
      readonly subtitle: string;
      readonly priority: TaskPriority | "all";
    }
  | {
      readonly kind: "open_task";
      readonly id: string;
      readonly title: string;
      readonly subtitle: string;
      readonly taskId: string;
      readonly taskCode: string;
    }
  | {
      readonly kind: "ai_rebalance";
      readonly id: string;
      readonly title: string;
      readonly subtitle: string;
    };

export interface ToastNotification {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly variant: "success" | "info" | "error";
  readonly undoLabel?: string;
  readonly onUndo?: () => void;
}

