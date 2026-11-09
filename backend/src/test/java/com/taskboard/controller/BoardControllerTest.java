package com.taskboard.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.taskboard.dto.BoardResponse;
import com.taskboard.service.BoardService;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(BoardController.class)
class BoardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BoardService boardService;

    @Test
    @DisplayName("ボード一覧は 200 と、包みに入ったボードの一覧を返す")
    void getBoardsReturnsList() throws Exception {
        when(boardService.findAll()).thenReturn(List.of(
                new BoardResponse(1L, "仕事", (short) 0),
                new BoardResponse(2L, "プライベート", (short) 1)));

        mockMvc.perform(get("/api/boards"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].name").value("仕事"))
                .andExpect(jsonPath("$.data[0].position").value(0))
                .andExpect(jsonPath("$.data[1].name").value("プライベート"));
    }
}
