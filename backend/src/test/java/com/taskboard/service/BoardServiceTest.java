package com.taskboard.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.Mockito.when;

import com.taskboard.dto.BoardResponse;
import com.taskboard.entity.Board;
import com.taskboard.repository.BoardRepository;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class BoardServiceTest {

    @Mock
    private BoardRepository boardRepository;

    @Test
    @DisplayName("ボードの一覧を、並び順（position）どおりに返す")
    void findAllReturnsBoardsInPositionOrder() {
        Board work = new Board("仕事", (short) 0);
        Board home = new Board("プライベート", (short) 1);
        ReflectionTestUtils.setField(work, "id", 1L);
        ReflectionTestUtils.setField(home, "id", 2L);
        when(boardRepository.findAllByOrderByPositionAsc()).thenReturn(List.of(work, home));

        List<BoardResponse> result = new BoardService(boardRepository).findAll();

        assertThat(result)
                .extracting(BoardResponse::id, BoardResponse::name, BoardResponse::position)
                .containsExactly(tuple(1L, "仕事", (short) 0), tuple(2L, "プライベート", (short) 1));
    }
}
