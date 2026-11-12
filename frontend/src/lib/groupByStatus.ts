import type { Task, TaskStatus } from '../api/schemas'

/** タスクを3つのカラムに分ける。並び順は API が返した順番（カラムの中は position の順）のまま */
export function groupByStatus(tasks: readonly Task[]): Record<TaskStatus, Task[]> {
  return {
    todo: tasks.filter((task) => task.status === 'todo'),
    doing: tasks.filter((task) => task.status === 'doing'),
    done: tasks.filter((task) => task.status === 'done'),
  }
}
