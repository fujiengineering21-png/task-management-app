import { z } from 'zod'

/** サーバーから届くデータの形（docs/API設計.md）。届いたデータは、使う前にこの形かを確かめる */

export const taskStatusSchema = z.enum(['todo', 'doing', 'done'])
export const prioritySchema = z.enum(['high', 'medium', 'low'])
export const labelColorSchema = z.enum(['green', 'yellow', 'orange', 'red', 'purple', 'blue'])

export const boardSchema = z.object({
  id: z.number(),
  name: z.string(),
  position: z.number(),
})

export const labelSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: labelColorSchema,
})

export const taskSchema = z.object({
  id: z.number(),
  boardId: z.number(),
  status: taskStatusSchema,
  position: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  completed: z.boolean(),
  priority: prioritySchema.nullable(),
  // 期限は「2026-11-10」の形の文字列のまま扱う（Date に変えると時差で1日ずれることがある。技術スタック 7章）
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  labels: z.array(labelSchema),
})

/** 成功でも失敗でも、この4つの項目で届く（API設計 1.1） */
export const envelopeSchema = z.object({
  success: z.boolean(),
  data: z.unknown(),
  error: z.object({ code: z.string(), message: z.string() }).nullable(),
  meta: z.unknown(),
})

export type TaskStatus = z.infer<typeof taskStatusSchema>
export type Priority = z.infer<typeof prioritySchema>
export type LabelColor = z.infer<typeof labelColorSchema>
export type Board = z.infer<typeof boardSchema>
export type Label = z.infer<typeof labelSchema>
export type Task = z.infer<typeof taskSchema>
