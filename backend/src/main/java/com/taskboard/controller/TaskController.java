package com.taskboard.controller;

import com.taskboard.dto.ApiResponse;
import com.taskboard.dto.TaskResponse;
import com.taskboard.service.TaskService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** タスクの API の入口。受け付けて service を呼び、共通の包みに入れて返すだけ。 */
@RestController
@RequestMapping("/api")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    /** GET /api/boards/{boardId}/tasks：1つのボードのタスク全件（未着手 → 作業中 → 完了の順）。 */
    @GetMapping("/boards/{boardId}/tasks")
    public ApiResponse<List<TaskResponse>> getTasksOfBoard(@PathVariable Long boardId) {
        return ApiResponse.ok(taskService.findByBoardId(boardId));
    }

    /** GET /api/tasks/{taskId}：タスク1件。 */
    @GetMapping("/tasks/{taskId}")
    public ApiResponse<TaskResponse> getTask(@PathVariable Long taskId) {
        return ApiResponse.ok(taskService.findById(taskId));
    }
}
