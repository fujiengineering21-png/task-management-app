package com.taskboard.controller;

import com.taskboard.dto.ApiResponse;
import com.taskboard.dto.BoardResponse;
import com.taskboard.service.BoardService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** ボードの API の入口。受け付けて service を呼び、共通の包みに入れて返すだけ。 */
@RestController
@RequestMapping("/api")
public class BoardController {

    private final BoardService boardService;

    public BoardController(BoardService boardService) {
        this.boardService = boardService;
    }

    /** GET /api/boards：ボードの一覧（タブの並び順どおり）。 */
    @GetMapping("/boards")
    public ApiResponse<List<BoardResponse>> getBoards() {
        return ApiResponse.ok(boardService.findAll());
    }
}
