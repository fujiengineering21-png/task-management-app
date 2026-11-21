package com.taskboard.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.taskboard.dto.LabelResponse;
import com.taskboard.entity.Board;
import com.taskboard.entity.Label;
import com.taskboard.entity.LabelColor;
import com.taskboard.repository.BoardRepository;
import com.taskboard.repository.LabelRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class LabelServiceTest {

    @Mock
    private BoardRepository boardRepository;

    @Mock
    private LabelRepository labelRepository;

    private LabelService labelService;

    @BeforeEach
    void setUp() {
        labelService = new LabelService(boardRepository, labelRepository);
    }

    @Test
    @DisplayName("ボードのラベルを、取り出した順（番号の順）に画面用の形で返す")
    void findByBoardIdReturnsLabels() {
        Board board = withId(new Board("仕事", (short) 0), 1L);
        Label urgent = withId(new Label(board, "緊急", LabelColor.RED), 1L);
        Label unnamed = withId(new Label(board, "", LabelColor.PURPLE), 2L);
        when(boardRepository.existsById(1L)).thenReturn(true);
        when(labelRepository.findAllByBoardId(1L)).thenReturn(List.of(urgent, unnamed));

        List<LabelResponse> result = labelService.findByBoardId(1L);

        assertThat(result).containsExactly(
                new LabelResponse(1L, "緊急", "red"),
                new LabelResponse(2L, "", "purple"));
    }

    @Test
    @DisplayName("ないボードのラベル一覧は、BoardNotFoundException になる")
    void findByBoardIdThrowsWhenBoardMissing() {
        when(boardRepository.existsById(9999L)).thenReturn(false);

        assertThatThrownBy(() -> labelService.findByBoardId(9999L))
                .isInstanceOf(BoardNotFoundException.class);
        verify(labelRepository, never()).findAllByBoardId(anyLong());
    }

    private static <T> T withId(T entity, Long id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }
}
