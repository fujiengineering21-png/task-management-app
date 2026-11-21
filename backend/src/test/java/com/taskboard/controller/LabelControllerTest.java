package com.taskboard.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.taskboard.dto.LabelResponse;
import com.taskboard.service.BoardNotFoundException;
import com.taskboard.service.LabelService;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(LabelController.class)
class LabelControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private LabelService labelService;

    @Test
    @DisplayName("ラベル一覧は 200 と、包みに入ったラベルの一覧を返す")
    void getLabelsOfBoardReturnsList() throws Exception {
        when(labelService.findByBoardId(1L)).thenReturn(List.of(
                new LabelResponse(1L, "緊急", "red"),
                new LabelResponse(3L, "会議", "blue")));

        mockMvc.perform(get("/api/boards/1/labels"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[0].name").value("緊急"))
                .andExpect(jsonPath("$.data[0].color").value("red"))
                .andExpect(jsonPath("$.data[1].id").value(3));
    }

    @Test
    @DisplayName("ないボードのラベル一覧は 404 を返す")
    void getLabelsOfBoardReturns404WhenBoardMissing() throws Exception {
        when(labelService.findByBoardId(9999L)).thenThrow(new BoardNotFoundException(9999L));

        mockMvc.perform(get("/api/boards/9999/labels"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("BOARD_NOT_FOUND"));
    }
}
