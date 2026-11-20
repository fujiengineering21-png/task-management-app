package com.taskboard.service;

import com.taskboard.dto.LabelResponse;
import com.taskboard.repository.BoardRepository;
import com.taskboard.repository.LabelRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** ラベルについてのルールと処理。 */
@Service
@Transactional(readOnly = true)
public class LabelService {

    private final BoardRepository boardRepository;
    private final LabelRepository labelRepository;

    public LabelService(BoardRepository boardRepository, LabelRepository labelRepository) {
        this.boardRepository = boardRepository;
        this.labelRepository = labelRepository;
    }

    /**
     * 1つのボードのラベルを、番号の順に全部返す（タスクに付いていないラベルも含む）。
     * ボードがなければ BoardNotFoundException。
     */
    public List<LabelResponse> findByBoardId(Long boardId) {
        if (!boardRepository.existsById(boardId)) {
            throw new BoardNotFoundException(boardId);
        }
        return labelRepository.findAllByBoardId(boardId).stream()
                .map(LabelResponse::from)
                .toList();
    }
}
