import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { z } from 'zod'
import { getJson } from './client'
import { boardSchema, taskSchema, type Board, type Task } from './schemas'

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
    queryKey: ['boards', boardId, 'tasks'],
    queryFn: () => getJson(`/api/boards/${boardId}/tasks`, z.array(taskSchema)),
    enabled: boardId !== undefined,
  })
}
