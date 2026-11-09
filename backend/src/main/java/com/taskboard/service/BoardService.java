package com.taskboard.service;

import com.taskboard.dto.BoardResponse;
import com.taskboard.repository.BoardRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** ボードについてのルールと処理。 */
@Service
@Transactional(readOnly = true)
public class BoardService {

    private final BoardRepository boardRepository;

    public BoardService(BoardRepository boardRepository) {
        this.boardRepository = boardRepository;
    }

    /** すべてのボードを、タブの並び順どおりに返す。 */
    public List<BoardResponse> findAll() {
        return boardRepository.findAllByOrderByPositionAsc().stream()
                .map(BoardResponse::from)
                .toList();
    }
}
