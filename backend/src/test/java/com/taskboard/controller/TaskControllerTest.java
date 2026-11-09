package com.taskboard.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.taskboard.dto.LabelResponse;
import com.taskboard.dto.TaskResponse;
import com.taskboard.service.BoardNotFoundException;
import com.taskboard.service.TaskNotFoundException;
import com.taskboard.service.TaskService;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
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
}
