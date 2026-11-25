package com.taskboard.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.taskboard.dto.CreateTaskRequest;
import com.taskboard.dto.LabelResponse;
import com.taskboard.dto.TaskResponse;
import com.taskboard.service.BoardNotFoundException;
import com.taskboard.service.InvalidTaskInputException;
import com.taskboard.service.TaskLimitExceededException;
import com.taskboard.service.TaskNotFoundException;
import com.taskboard.service.TaskService;
import org.springframework.dao.PessimisticLockingFailureException;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(TaskController.class)
class TaskControllerTest {

    private static final TaskResponse MEETING_TASK = new TaskResponse(
            3L, 1L, "doing", 0, "会議の資料をまとめる", "議題を1枚にまとめる",
            false, "high", LocalDate.of(2026, 11, 10),
            List.of(new LabelResponse(3L, "会議", "blue")));

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TaskService taskService;

    @Test
    @DisplayName("全件取得は 200 と、包みに入ったタスクの一覧を返す")
    void getTasksOfBoardReturnsList() throws Exception {
        when(taskService.findByBoardId(1L)).thenReturn(List.of(MEETING_TASK));

        mockMvc.perform(get("/api/boards/1/tasks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.error").value(nullValue()))
                .andExpect(jsonPath("$.meta").value(nullValue()))
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(3))
                .andExpect(jsonPath("$.data[0].boardId").value(1))
                .andExpect(jsonPath("$.data[0].status").value("doing"))
                .andExpect(jsonPath("$.data[0].title").value("会議の資料をまとめる"))
                .andExpect(jsonPath("$.data[0].completed").value(false))
                .andExpect(jsonPath("$.data[0].priority").value("high"))
                .andExpect(jsonPath("$.data[0].dueDate").value("2026-11-10"))
                .andExpect(jsonPath("$.data[0].labels[0].name").value("会議"))
                .andExpect(jsonPath("$.data[0].labels[0].color").value("blue"));
    }

    @Test
    @DisplayName("1件取得は 200 と、包みに入ったタスクを返す")
    void getTaskReturnsOne() throws Exception {
        when(taskService.findById(3L)).thenReturn(MEETING_TASK);

        mockMvc.perform(get("/api/tasks/3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(3))
                .andExpect(jsonPath("$.data.title").value("会議の資料をまとめる"));
    }

    @Test
    @DisplayName("ないタスクは 404 と、日本語のエラーを返す")
    void getTaskReturns404WhenMissing() throws Exception {
        when(taskService.findById(9999L)).thenThrow(new TaskNotFoundException(9999L));

        mockMvc.perform(get("/api/tasks/9999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andExpect(jsonPath("$.error.code").value("TASK_NOT_FOUND"))
                .andExpect(jsonPath("$.error.message").value("タスクが見つかりません"));
    }

    @Test
    @DisplayName("ないボードの全件取得は 404 と、日本語のエラーを返す")
    void getTasksOfBoardReturns404WhenBoardMissing() throws Exception {
        when(taskService.findByBoardId(9999L)).thenThrow(new BoardNotFoundException(9999L));

        mockMvc.perform(get("/api/boards/9999/tasks"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("BOARD_NOT_FOUND"))
                .andExpect(jsonPath("$.error.message").value("ボードが見つかりません"));
    }

    @Test
    @DisplayName("番号が数字でないときは 400 と、日本語のエラーを返す")
    void getTaskReturns400WhenIdIsNotNumber() throws Exception {
        mockMvc.perform(get("/api/tasks/abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("INVALID_ID"))
                .andExpect(jsonPath("$.error.message").value("番号の形が正しくありません"));
    }

    @Test
    @DisplayName("予想外のエラーは 500 と、内部情報を含まない日本語のメッセージを返す")
    void unexpectedErrorReturns500WithoutInternalDetails() throws Exception {
        when(taskService.findById(1L)).thenThrow(new IllegalStateException("SQL: select * from secret_table"));

        mockMvc.perform(get("/api/tasks/1"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.error.message").value("サーバーでエラーが起きました"))
                .andExpect(content().string(not(containsString("secret_table"))));
    }

    @Test
    @DisplayName("その URL で使えないメソッドは 405 と、使えるメソッド（Allow）を返す")
    void unsupportedMethodReturns405() throws Exception {
        mockMvc.perform(post("/api/tasks/3"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(header().string("Allow", containsString("GET")))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("METHOD_NOT_ALLOWED"));
    }

    @Test
    @DisplayName("ない URL は 404 と、包みに入ったエラーを返す（500 にしない）")
    void unknownUrlReturns404() throws Exception {
        mockMvc.perform(get("/api/unknown"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    private static final String CREATE_BODY = """
            {"title":"資料を印刷する","description":null,"status":"todo",
             "priority":"high","dueDate":"2026-11-25","labelIds":[3]}
            """;

    @Test
    @DisplayName("作成は 201 と、包みに入った作ったタスクを返す")
    void createTaskReturns201() throws Exception {
        TaskResponse created = new TaskResponse(14L, 1L, "todo", 3, "資料を印刷する", null,
                false, "high", LocalDate.of(2026, 11, 25),
                List.of(new LabelResponse(3L, "会議", "blue")));
        CreateTaskRequest expected = new CreateTaskRequest("資料を印刷する", null, "todo", "high",
                LocalDate.of(2026, 11, 25), List.of(3L));
        when(taskService.create(1L, expected)).thenReturn(created);

        mockMvc.perform(post("/api/boards/1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CREATE_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.error").value(nullValue()))
                .andExpect(jsonPath("$.data.id").value(14))
                .andExpect(jsonPath("$.data.position").value(3))
                .andExpect(jsonPath("$.data.dueDate").value("2026-11-25"))
                .andExpect(jsonPath("$.data.labels[0].id").value(3));
    }

    @Test
    @DisplayName("入力が正しくないときは 400 と、何が正しくないかの日本語のメッセージを返す")
    void createTaskReturns400WhenInputInvalid() throws Exception {
        when(taskService.create(eq(1L), any()))
                .thenThrow(new InvalidTaskInputException("タイトルを入力してください"));

        mockMvc.perform(post("/api/boards/1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CREATE_BODY))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.message").value("タイトルを入力してください"));
    }

    @Test
    @DisplayName("ボードのタスクが上限に達していたら 409 と、日本語のメッセージを返す")
    void createTaskReturns409WhenBoardIsFull() throws Exception {
        when(taskService.create(eq(1L), any())).thenThrow(new TaskLimitExceededException(1L));

        mockMvc.perform(post("/api/boards/1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CREATE_BODY))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("TASK_LIMIT_REACHED"))
                .andExpect(jsonPath("$.error.message").value("これ以上タスクを作成できません"));
    }

    @Test
    @DisplayName("ないボードへの作成は 404 を返す")
    void createTaskReturns404WhenBoardMissing() throws Exception {
        when(taskService.create(eq(9999L), any())).thenThrow(new BoardNotFoundException(9999L));

        mockMvc.perform(post("/api/boards/9999/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CREATE_BODY))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("BOARD_NOT_FOUND"));
    }

    @Test
    @DisplayName("壊れた JSON や、日付の形が違う中身は 400 を返す（500 にしない）")
    void createTaskReturns400WhenBodyBroken() throws Exception {
        for (String body : List.of("{\"title\":", "{\"title\":\"a\",\"dueDate\":\"11/25\"}", "")) {
            mockMvc.perform(post("/api/boards/1/tasks")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.error.code").value("INVALID_BODY"))
                    .andExpect(jsonPath("$.error.message").value("送られた内容の形が正しくありません"));
        }
    }

    @Test
    @DisplayName("JSON 以外の形で送られたら 415 と、包みに入ったエラーを返す")
    void createTaskReturns415WhenNotJson() throws Exception {
        mockMvc.perform(post("/api/boards/1/tasks")
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("title=a"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("BAD_REQUEST"));
    }

    @Test
    @DisplayName("ほかの作成とぶつかってロックを待ちきれなかったら 503 と、やり直しを促す日本語のメッセージを返す")
    void createTaskReturns503WhenLockTimesOut() throws Exception {
        when(taskService.create(eq(1L), any()))
                .thenThrow(new PessimisticLockingFailureException("lock timeout"));

        mockMvc.perform(post("/api/boards/1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CREATE_BODY))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("BUSY"))
                .andExpect(jsonPath("$.error.message").value("混み合っています。少し待ってからもう一度お試しください"))
                .andExpect(content().string(not(containsString("lock timeout"))));
    }

    @Test
    @DisplayName("書き換えは 200 と、包みに入った書き換えたあとのタスクを返す")
    void updateTaskReturns200() throws Exception {
        TaskResponse updated = new TaskResponse(3L, 1L, "done", 1, "資料を印刷する", null,
                false, "high", LocalDate.of(2026, 11, 25),
                List.of(new LabelResponse(3L, "会議", "blue")));
        CreateTaskRequest expected = new CreateTaskRequest("資料を印刷する", null, "todo", "high",
                LocalDate.of(2026, 11, 25), List.of(3L));
        when(taskService.update(3L, expected)).thenReturn(updated);

        mockMvc.perform(put("/api/tasks/3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CREATE_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(3))
                .andExpect(jsonPath("$.data.status").value("done"))
                .andExpect(jsonPath("$.data.position").value(1));
    }

    @Test
    @DisplayName("ないタスクの書き換えは 404 と TASK_NOT_FOUND を返す（画面が R-28 の文を出す）")
    void updateTaskReturns404WhenMissing() throws Exception {
        when(taskService.update(eq(9999L), any())).thenThrow(new TaskNotFoundException(9999L));

        mockMvc.perform(put("/api/tasks/9999")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CREATE_BODY))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("TASK_NOT_FOUND"));
    }

    @Test
    @DisplayName("書き換えの入力が正しくないときは 400 と日本語のメッセージを返す")
    void updateTaskReturns400WhenInputInvalid() throws Exception {
        when(taskService.update(eq(3L), any()))
                .thenThrow(new InvalidTaskInputException("タイトルを入力してください"));

        mockMvc.perform(put("/api/tasks/3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CREATE_BODY))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.message").value("タイトルを入力してください"));
    }

    @Test
    @DisplayName("書き換えで、番号が数字でない・中身が壊れているときは 400 を返す")
    void updateTaskReturns400WhenIdOrBodyBroken() throws Exception {
        mockMvc.perform(put("/api/tasks/abc")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CREATE_BODY))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_ID"));

        mockMvc.perform(put("/api/tasks/3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_BODY"));
    }
}
