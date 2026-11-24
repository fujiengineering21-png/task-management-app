import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import { z } from 'zod'
import { getJson, postJson } from './client'
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
