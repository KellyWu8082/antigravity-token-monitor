import {
  ANALYTICS_SNAPSHOTS,
  INITIAL_ACTIVITY_TIMELINE,
  INITIAL_TASKS,
  TEAM_MEMBERS,
} from "@/data/mock-data";
import { findMemberById, STATUS_LABELS } from "@/lib/utils";
import type {
  ActivityEvent,
  AnalyticsSnapshot,
  AnalyticsTimeframe,
  BatchMoveTasksPayload,
  CreateTaskPayload,
  MoveTaskPayload,
  NexusTask,
  TaskStatus,
  UpdateTaskPayload,
} from "@/types/nexus";

let taskStore: NexusTask[] = [...INITIAL_TASKS];
let activityStore: ActivityEvent[] = [...INITIAL_ACTIVITY_TIMELINE];
let nextCodeNumber = 110;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function sortColumnTasks(tasks: NexusTask[]): NexusTask[] {
  const statusOrder: Record<TaskStatus, number> = {
    todo: 0,
    in_progress: 1,
    in_review: 2,
    done: 3,
  };
  return [...tasks].sort((a, b) => {
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return a.order - b.order;
  });
}

function normalizeColumnOrders(tasks: NexusTask[], status: TaskStatus): NexusTask[] {
  const inColumn = tasks
    .filter((task) => task.status === status)
    .sort((a, b) => a.order - b.order);
  const reindexed = new Map<string, number>();
  inColumn.forEach((task, idx) => {
    reindexed.set(task.id, idx);
  });
  return tasks.map((task) => {
    const newOrder = reindexed.get(task.id);
    if (newOrder === undefined) return task;
    return { ...task, order: newOrder };
  });
}

function appendActivityEvent(
  event: Omit<ActivityEvent, "id" | "timestampLabel">
): void {
  const nextEvent: ActivityEvent = {
    ...event,
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestampLabel: "刚刚",
  };
  activityStore = [nextEvent, ...activityStore].slice(0, 14);
}

export function applyMoveTaskOptimistically(
  tasks: readonly NexusTask[],
  payload: MoveTaskPayload
): NexusTask[] {
  const movingTask = tasks.find((task) => task.id === payload.taskId);
  if (!movingTask) return [...tasks];

  const remaining = tasks.filter((task) => task.id !== payload.taskId);
  const targetColumnTasks = remaining
    .filter((task) => task.status === payload.targetStatus)
    .sort((a, b) => a.order - b.order);

  const clampedIndex = Math.max(
    0,
    Math.min(payload.targetIndex, targetColumnTasks.length)
  );

  const updatedProgress =
    payload.targetStatus === "done"
      ? 100
      : payload.targetStatus === "in_review" && movingTask.aiProgress < 85
        ? 88
        : payload.targetStatus === "in_progress" && movingTask.aiProgress < 25
          ? 35
          : movingTask.aiProgress;

  const updatedEstimate =
    payload.targetStatus === "done"
      ? "AI 验证 · 已完成闭环"
      : payload.targetStatus === "in_review"
        ? "AI 预测 · 等待合并审查"
        : movingTask.aiEstimateLabel;

  const updatedMovingTask: NexusTask = {
    ...movingTask,
    status: payload.targetStatus,
    aiProgress: updatedProgress,
    aiEstimateLabel: updatedEstimate,
    updatedAt: new Date().toISOString(),
    order: clampedIndex,
  };

  targetColumnTasks.splice(clampedIndex, 0, updatedMovingTask);

  const updatedTargetMap = new Map<string, NexusTask>();
  targetColumnTasks.forEach((task, idx) => {
    updatedTargetMap.set(task.id, { ...task, order: idx });
  });

  const merged = remaining
    .filter((task) => task.status !== payload.targetStatus)
    .concat(Array.from(updatedTargetMap.values()));

  return sortColumnTasks(normalizeColumnOrders(merged, movingTask.status));
}

export async function fetchTasks(): Promise<NexusTask[]> {
  await delay(360);
  return sortColumnTasks(taskStore);
}

export async function moveTask(payload: MoveTaskPayload): Promise<NexusTask[]> {
  await delay(180);
  const previous = taskStore.find((task) => task.id === payload.taskId);
  taskStore = applyMoveTaskOptimistically(taskStore, payload);

  if (previous && previous.status !== payload.targetStatus) {
    const member = findMemberById(TEAM_MEMBERS, previous.assigneeId);
    appendActivityEvent({
      actorName: member.name,
      actorInitials: member.initials,
      actorGradient: member.avatarGradient,
      isAiAgent: false,
      actionText: `将任务「${previous.title}」流转至 ${STATUS_LABELS[payload.targetStatus]}`,
      targetCode: previous.code,
      category: "status",
    });
  }

  return sortColumnTasks(taskStore);
}

export async function batchMoveTasks(
  payload: BatchMoveTasksPayload
): Promise<NexusTask[]> {
  await delay(220);
  const idSet = new Set(payload.taskIds);
  let targetOrderCursor = taskStore.filter(
    (task) => task.status === payload.targetStatus && !idSet.has(task.id)
  ).length;

  taskStore = taskStore.map((task) => {
    if (!idSet.has(task.id)) return task;
    const nextOrder = targetOrderCursor;
    targetOrderCursor += 1;
    return {
      ...task,
      status: payload.targetStatus,
      aiProgress:
        payload.targetStatus === "done"
          ? 100
          : payload.targetStatus === "in_review"
            ? Math.max(task.aiProgress, 88)
            : task.aiProgress,
      aiEstimateLabel:
        payload.targetStatus === "done"
          ? "AI 命令 · 已批量归档完成"
          : task.aiEstimateLabel,
      updatedAt: new Date().toISOString(),
      order: nextOrder,
    };
  });

  taskStore = sortColumnTasks(taskStore);

  appendActivityEvent({
    actorName: "Nexus AI Command",
    actorInitials: "AI",
    actorGradient: "from-indigo-500 to-cyan-400",
    isAiAgent: true,
    actionText: `执行自然语言指令「${payload.commandLabel}」，批量迁移 ${payload.taskIds.length} 项任务至 ${STATUS_LABELS[payload.targetStatus]}`,
    category: "command",
  });

  return taskStore;
}

export async function restoreTasksSnapshot(
  snapshot: readonly NexusTask[]
): Promise<NexusTask[]> {
  await delay(160);
  taskStore = sortColumnTasks([...snapshot]);
  appendActivityEvent({
    actorName: "Nexus AI Command",
    actorInitials: "AI",
    actorGradient: "from-indigo-500 to-cyan-400",
    isAiAgent: true,
    actionText: "已撤销上一条 AI 批量调度操作并恢复工作区快照",
    category: "command",
  });
  return taskStore;
}

export async function createTask(
  payload: CreateTaskPayload
): Promise<NexusTask> {
  await delay(200);
  const code = `NX-${nextCodeNumber}`;
  nextCodeNumber += 1;
  const maxOrder = taskStore
    .filter((task) => task.status === payload.status)
    .reduce((max, task) => Math.max(max, task.order), -1);

  const created: NexusTask = {
    id: `task-${Date.now()}`,
    code,
    title: payload.title,
    description: payload.description,
    status: payload.status,
    priority: payload.priority,
    assigneeId: payload.assigneeId,
    tags: payload.tags.length > 0 ? payload.tags : ["AI Sprint"],
    aiProgress:
      payload.status === "done"
        ? 100
        : payload.status === "in_review"
          ? 85
          : payload.status === "in_progress"
            ? 28
            : 10,
    aiConfidence: 93,
    aiEstimateLabel: "AI 预测 · 刚接入协同流",
    storyPoints: payload.storyPoints,
    updatedAt: new Date().toISOString(),
    order: maxOrder + 1,
    subtasks: [
      { id: `st-${Date.now()}-1`, title: "AI 自动拆解验收边界", completed: false },
    ],
  };

  taskStore = sortColumnTasks([...taskStore, created]);
  const member = findMemberById(TEAM_MEMBERS, created.assigneeId);

  appendActivityEvent({
    actorName: member.name,
    actorInitials: member.initials,
    actorGradient: member.avatarGradient,
    isAiAgent: false,
    actionText: `创建了新任务「${created.title}」`,
    targetCode: created.code,
    category: "code",
  });

  return created;
}

export async function updateTask(
  payload: UpdateTaskPayload
): Promise<NexusTask> {
  await delay(160);
  const existing = taskStore.find((task) => task.id === payload.taskId);
  if (!existing) {
    throw new Error(`Task ${payload.taskId} not found`);
  }

  const nextStatus = payload.patch.status;
  if (nextStatus && nextStatus !== existing.status) {
    const targetCount = taskStore.filter(
      (task) => task.status === nextStatus && task.id !== existing.id
    ).length;
    taskStore = applyMoveTaskOptimistically(taskStore, {
      taskId: existing.id,
      targetStatus: nextStatus,
      targetIndex: targetCount,
    });
    const member = findMemberById(TEAM_MEMBERS, existing.assigneeId);
    appendActivityEvent({
      actorName: member.name,
      actorInitials: member.initials,
      actorGradient: member.avatarGradient,
      isAiAgent: false,
      actionText: `将任务「${existing.title}」流转至 ${STATUS_LABELS[nextStatus]}`,
      targetCode: existing.code,
      category: "status",
    });
  }

  let updatedTask: NexusTask | undefined;
  taskStore = taskStore.map((task) => {
    if (task.id !== payload.taskId) return task;
    const { status: _ignoredStatus, ...restPatch } = payload.patch;
    updatedTask = {
      ...task,
      ...restPatch,
      updatedAt: new Date().toISOString(),
    };
    return updatedTask;
  });

  if (!updatedTask) {
    throw new Error(`Task ${payload.taskId} not found`);
  }

  return updatedTask;
}

export async function deleteTask(taskId: string): Promise<string> {
  await delay(150);
  const existing = taskStore.find((task) => task.id === taskId);
  taskStore = taskStore.filter((task) => task.id !== taskId);
  if (existing) {
    appendActivityEvent({
      actorName: "Nexus AI",
      actorInitials: "AI",
      actorGradient: "from-indigo-500 to-cyan-400",
      isAiAgent: true,
      actionText: `归档并移除了任务「${existing.title}」`,
      targetCode: existing.code,
      category: "command",
    });
  }
  return taskId;
}

export async function aiOptimizeBoard(): Promise<NexusTask[]> {
  await delay(280);
  const priorityScore: Record<NexusTask["priority"], number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  const grouped = new Map<TaskStatus, NexusTask[]>();
  for (const status of ["todo", "in_progress", "in_review", "done"] as const) {
    grouped.set(status, []);
  }
  for (const task of taskStore) {
    grouped.get(task.status)?.push(task);
  }

  const nextList: NexusTask[] = [];
  for (const [, list] of grouped.entries()) {
    const sorted = [...list].sort(
      (a, b) => priorityScore[a.priority] - priorityScore[b.priority]
    );
    sorted.forEach((task, idx) => {
      nextList.push({
        ...task,
        order: idx,
        aiConfidence: Math.min(99, task.aiConfidence + 2),
        updatedAt: new Date().toISOString(),
      });
    });
  }

  taskStore = sortColumnTasks(nextList);

  appendActivityEvent({
    actorName: "Nexus AI Scheduler",
    actorInitials: "AI",
    actorGradient: "from-indigo-500 to-cyan-400",
    isAiAgent: true,
    actionText: "依据阻塞权重与置信度重新编排了全看板任务队列",
    category: "ai",
  });

  return taskStore;
}

export async function fetchAnalyticsSnapshot(
  timeframe: AnalyticsTimeframe
): Promise<AnalyticsSnapshot> {
  await delay(260);
  const base = ANALYTICS_SNAPSHOTS[timeframe];
  const doneCount = taskStore.filter((task) => task.status === "done").length;
  const totalPointsDone = taskStore
    .filter((task) => task.status === "done")
    .reduce((acc, task) => acc + task.storyPoints, 0);

  return {
    ...base,
    weeklyVelocity: base.weeklyVelocity + Math.max(0, totalPointsDone - 6),
    aiCodeAdoptionRate: Number(
      Math.min(96.4, base.aiCodeAdoptionRate + doneCount * 0.3).toFixed(1)
    ),
  };
}

export async function fetchActivityTimeline(): Promise<ActivityEvent[]> {
  await delay(180);
  return [...activityStore];
}

