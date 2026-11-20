package com.taskboard.controller;

import com.taskboard.dto.ApiResponse;
import com.taskboard.dto.LabelResponse;
import com.taskboard.service.LabelService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** ラベルの API の入口。受け付けて service を呼び、共通の包みに入れて返すだけ。 */
@RestController
@RequestMapping("/api")
public class LabelController {

    private final LabelService labelService;

    public LabelController(LabelService labelService) {
        this.labelService = labelService;
    }

    /** GET /api/boards/{boardId}/labels：1つのボードのラベル全部（番号の順）。 */
    @GetMapping("/boards/{boardId}/labels")
    public ApiResponse<List<LabelResponse>> getLabelsOfBoard(@PathVariable Long boardId) {
        return ApiResponse.ok(labelService.findByBoardId(boardId));
    }
}
