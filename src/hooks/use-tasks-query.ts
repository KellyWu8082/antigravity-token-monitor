"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  aiOptimizeBoard,
  applyMoveTaskOptimistically,
  batchMoveTasks,
  createTask,
  deleteTask,
  fetchTasks,
  moveTask,
  restoreTasksSnapshot,
  updateTask,
} from "@/lib/mock-api";
import type {
  BatchMoveTasksPayload,
  CreateTaskPayload,
  MoveTaskPayload,
  NexusTask,
  UpdateTaskPayload,
} from "@/types/nexus";

export const TASKS_QUERY_KEY = ["nexus", "tasks"] as const;
export const ANALYTICS_QUERY_KEY = ["nexus", "analytics"] as const;
export const TIMELINE_QUERY_KEY = ["nexus", "timeline"] as const;

interface TasksRollbackContext {
  readonly previousTasks: NexusTask[] | undefined;
}

export function useTasksQuery() {
  return useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: fetchTasks,
    staleTime: 60 * 1000,
  });
}

export function useMoveTaskMutation(onErrorNotify?: (message: string) => void) {
  const queryClient = useQueryClient();

  return useMutation<NexusTask[], Error, MoveTaskPayload, TasksRollbackContext>({
    mutationFn: moveTask,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      const previousTasks =
        queryClient.getQueryData<NexusTask[]>(TASKS_QUERY_KEY);
      if (previousTasks) {
        queryClient.setQueryData<NexusTask[]>(
          TASKS_QUERY_KEY,
          applyMoveTaskOptimistically(previousTasks, payload)
        );
      }
      return { previousTasks };
    },
    onError: (_error, _payload, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(TASKS_QUERY_KEY, context.previousTasks);
      }
      onErrorNotify?.("任务移动同步失败，已回滚至上一状态");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: TIMELINE_QUERY_KEY });
    },
  });
}

export function useBatchMoveTasksMutation(options?: {
  readonly onSuccessWithSnapshot?: (
    payload: BatchMoveTasksPayload,
    previousTasks: readonly NexusTask[]
  ) => void;
  readonly onErrorNotify?: (message: string) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation<
    NexusTask[],
    Error,
    BatchMoveTasksPayload,
    TasksRollbackContext
  >({
    mutationFn: batchMoveTasks,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      const previousTasks =
        queryClient.getQueryData<NexusTask[]>(TASKS_QUERY_KEY);
      if (previousTasks) {
        const idSet = new Set(payload.taskIds);
        let orderCursor = previousTasks.filter(
          (t) => t.status === payload.targetStatus && !idSet.has(t.id)
        ).length;

        const nextTasks = previousTasks.map((task) => {
          if (!idSet.has(task.id)) return task;
          const nextOrder = orderCursor;
          orderCursor += 1;
          return {
            ...task,
            status: payload.targetStatus,
            aiProgress:
              payload.targetStatus === "done"
                ? 100
                : payload.targetStatus === "in_review"
                  ? Math.max(task.aiProgress, 88)
                  : task.aiProgress,
            updatedAt: new Date().toISOString(),
            order: nextOrder,
          };
        });
        queryClient.setQueryData<NexusTask[]>(TASKS_QUERY_KEY, nextTasks);
      }
      return { previousTasks };
    },
    onSuccess: (_data, payload, context) => {
      if (context?.previousTasks) {
        options?.onSuccessWithSnapshot?.(payload, context.previousTasks);
      }
    },
    onError: (_error, _payload, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(TASKS_QUERY_KEY, context.previousTasks);
      }
      options?.onErrorNotify?.("AI 批量迁移失败，已自动回滚任务列表");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: TIMELINE_QUERY_KEY });
    },
  });
}

export function useRestoreTasksMutation() {
  const queryClient = useQueryClient();

  return useMutation<NexusTask[], Error, readonly NexusTask[]>({
    mutationFn: restoreTasksSnapshot,
    onMutate: async (snapshot) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.setQueryData<NexusTask[]>(TASKS_QUERY_KEY, [...snapshot]);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: TIMELINE_QUERY_KEY });
    },
  });
}

export function useCreateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation<NexusTask, Error, CreateTaskPayload, TasksRollbackContext>({
    mutationFn: createTask,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      const previousTasks =
        queryClient.getQueryData<NexusTask[]>(TASKS_QUERY_KEY);
      if (previousTasks) {
        const optimisticTask: NexusTask = {
          id: `optimistic-${Date.now()}`,
          code: "NX-NEW",
          title: payload.title,
          description: payload.description,
          status: payload.status,
          priority: payload.priority,
          assigneeId: payload.assigneeId,
          tags: payload.tags.length > 0 ? payload.tags : ["AI Sprint"],
          aiProgress: payload.status === "done" ? 100 : 18,
          aiConfidence: 92,
          aiEstimateLabel: "AI 同步评估中...",
          aiSyncing: true,
          storyPoints: payload.storyPoints,
          updatedAt: new Date().toISOString(),
          order: previousTasks.filter((t) => t.status === payload.status).length,
          subtasks: [],
        };
        queryClient.setQueryData<NexusTask[]>(TASKS_QUERY_KEY, [
          ...previousTasks,
          optimisticTask,
        ]);
      }
      return { previousTasks };
    },
    onError: (_err, _payload, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(TASKS_QUERY_KEY, context.previousTasks);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: TIMELINE_QUERY_KEY });
    },
  });
}

export function useUpdateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation<NexusTask, Error, UpdateTaskPayload, TasksRollbackContext>({
    mutationFn: updateTask,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      const previousTasks =
        queryClient.getQueryData<NexusTask[]>(TASKS_QUERY_KEY);
      if (previousTasks) {
        let nextTasks = [...previousTasks];
        const current = nextTasks.find((task) => task.id === payload.taskId);
        if (
          current &&
          payload.patch.status &&
          payload.patch.status !== current.status
        ) {
          const targetCount = nextTasks.filter(
            (task) =>
              task.status === payload.patch.status && task.id !== current.id
          ).length;
          nextTasks = applyMoveTaskOptimistically(nextTasks, {
            taskId: current.id,
            targetStatus: payload.patch.status,
            targetIndex: targetCount,
          });
        }
        const { status: _ignoredStatus, ...restPatch } = payload.patch;
        queryClient.setQueryData<NexusTask[]>(
          TASKS_QUERY_KEY,
          nextTasks.map((task) =>
            task.id === payload.taskId
              ? {
                  ...task,
                  ...restPatch,
                  updatedAt: new Date().toISOString(),
                }
              : task
          )
        );
      }
      return { previousTasks };
    },
    onError: (_err, _payload, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(TASKS_QUERY_KEY, context.previousTasks);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: TIMELINE_QUERY_KEY });
    },
  });
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation<string, Error, string, TasksRollbackContext>({
    mutationFn: deleteTask,
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      const previousTasks =
        queryClient.getQueryData<NexusTask[]>(TASKS_QUERY_KEY);
      if (previousTasks) {
        queryClient.setQueryData<NexusTask[]>(
          TASKS_QUERY_KEY,
          previousTasks.filter((task) => task.id !== taskId)
        );
      }
      return { previousTasks };
    },
    onError: (_err, _taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(TASKS_QUERY_KEY, context.previousTasks);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: TIMELINE_QUERY_KEY });
    },
  });
}

export function useAiOptimizeBoardMutation() {
  const queryClient = useQueryClient();

  return useMutation<NexusTask[], Error, void>({
    mutationFn: aiOptimizeBoard,
    onSuccess: (nextTasks) => {
      queryClient.setQueryData<NexusTask[]>(TASKS_QUERY_KEY, nextTasks);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: TIMELINE_QUERY_KEY });
    },
  });
}

