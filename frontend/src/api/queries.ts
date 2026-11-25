import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import { z } from 'zod'
import { ApiError, deleteJson, getJson, postJson, putJson } from './client'
import {
  boardSchema,
  labelSchema,
  taskSchema,
  type Board,
  type CreateTaskInput,
  type Label,
  type Task,
} from './schemas'

/** 1つのボードのタスク一覧を覚えておく場所の名前 */
function boardTasksKey(boardId: number | undefined) {
  return ['boards', boardId, 'tasks'] as const
}

/** ボードの一覧（GET /api/boards） */
export function useBoards(): UseQueryResult<Board[]> {
  return useQuery({
    queryKey: ['boards'],
    queryFn: () => getJson('/api/boards', z.array(boardSchema)),
  })
}

/** 1つのボードのタスク全件（GET /api/boards/{boardId}/tasks）。boardId が決まるまでは読み込まない */
export function useBoardTasks(boardId: number | undefined): UseQueryResult<Task[]> {
  return useQuery({
    queryKey: boardTasksKey(boardId),
    queryFn: () => getJson(`/api/boards/${boardId}/tasks`, z.array(taskSchema)),
    enabled: boardId !== undefined,
  })
}

/** 1つのボードのラベル全部（GET /api/boards/{boardId}/labels）。作成の小窓のラベル欄に使う */
export function useBoardLabels(boardId: number): UseQueryResult<Label[]> {
  return useQuery({
    queryKey: ['boards', boardId, 'labels'],
    queryFn: () => getJson(`/api/boards/${boardId}/labels`, z.array(labelSchema)),
  })
}

/**
 * タスクを作る（POST /api/boards/{boardId}/tasks）。
 * 成功したら、そのボードのタスク一覧を読み直し、読み終わってから完了にする
 * （小窓を閉じたときに、新しいカードがもう出ているように。R-24：サーバーの成功を待ってから画面に反映）
 * 失敗したときも読み直す。保存はできたのに返事が読めなかった場合に、作られたタスクを見せて、
 * 押し直しによる重複を防ぐため（こちらは待たない）
 */
export function useCreateTask(boardId: number): UseMutationResult<Task, Error, CreateTaskInput> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      postJson(`/api/boards/${boardId}/tasks`, input, taskSchema),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardTasksKey(boardId) }),
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: boardTasksKey(boardId) })
    },
  })
}

/** 書き換えるタスクの番号と、新しい中身 */
export interface UpdateTaskVariables {
  taskId: number
  input: CreateTaskInput
}

/**
 * タスクを書き換える（PUT /api/tasks/{taskId}）。作成と同じく、成功したら一覧を読み終わってから完了にする。
 * 失敗したときも一覧を読み直す。ほかの人が削除していた（R-28）ときに、ボードを最新にするため
 */
export function useUpdateTask(
  boardId: number,
): UseMutationResult<Task, Error, UpdateTaskVariables> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, input }: UpdateTaskVariables) =>
      putJson(`/api/tasks/${taskId}`, input, taskSchema),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardTasksKey(boardId) }),
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: boardTasksKey(boardId) })
    },
  })
}

/**
 * タスクを削除する（DELETE /api/tasks/{taskId}）。成功したら一覧を読み終わってから完了にする。
 * ほかの人がすでに削除していた（TASK_NOT_FOUND）ときは、「削除できた」として扱う（UC-03）。
 * 失敗したときも一覧を読み直す
 */
export function useDeleteTask(boardId: number): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (taskId: number) => {
      try {
        await deleteJson(`/api/tasks/${taskId}`, z.null())
      } catch (error) {
        if (error instanceof ApiError && error.code === 'TASK_NOT_FOUND') {
          return
        }
        throw error
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardTasksKey(boardId) }),
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: boardTasksKey(boardId) })
    },
  })
}
