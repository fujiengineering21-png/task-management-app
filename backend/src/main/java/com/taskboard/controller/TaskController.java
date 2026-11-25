package com.taskboard.controller;

import com.taskboard.dto.ApiResponse;
import com.taskboard.dto.CreateTaskRequest;
import com.taskboard.dto.TaskResponse;
import com.taskboard.service.TaskService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
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

    /** POST /api/boards/{boardId}/tasks：タスクを作る。201 と、作ったタスク（番号付き）を返す。 */
    @PostMapping("/boards/{boardId}/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TaskResponse> createTask(@PathVariable Long boardId,
            @RequestBody CreateTaskRequest request) {
        return ApiResponse.ok(taskService.create(boardId, request));
    }

    /** PUT /api/tasks/{taskId}：タスクを書き換える（全部の項目を置き換える）。200 と、書き換えたあとのタスクを返す。 */
    @PutMapping("/tasks/{taskId}")
    public ApiResponse<TaskResponse> updateTask(@PathVariable Long taskId,
            @RequestBody CreateTaskRequest request) {
        return ApiResponse.ok(taskService.update(taskId, request));
    }
}
