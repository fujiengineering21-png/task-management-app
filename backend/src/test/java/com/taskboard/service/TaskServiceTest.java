package com.taskboard.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.taskboard.dto.LabelResponse;
import com.taskboard.dto.TaskResponse;
import com.taskboard.entity.Board;
import com.taskboard.entity.Label;
import com.taskboard.entity.LabelColor;
import com.taskboard.entity.Task;
import com.taskboard.entity.TaskPriority;
import com.taskboard.entity.TaskStatus;
import com.taskboard.repository.BoardRepository;
import com.taskboard.repository.TaskRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private BoardRepository boardRepository;

    @Mock
    private TaskRepository taskRepository;

    private TaskService taskService;
    private Board board;

    @BeforeEach
    void setUp() {
        taskService = new TaskService(boardRepository, taskRepository);
        board = withId(new Board("仕事", (short) 0), 1L);
    }

    @Test
    @DisplayName("全件取得は、未着手 → 作業中 → 完了の順、カラムの中は並び順どおりに返す")
    void findByBoardIdSortsByColumnThenPosition() {
        Task done = task(1L, TaskStatus.DONE, 0);
        Task todoSecond = task(2L, TaskStatus.TODO, 1);
        Task doing = task(3L, TaskStatus.DOING, 0);
        Task todoFirst = task(4L, TaskStatus.TODO, 0);
        when(boardRepository.existsById(1L)).thenReturn(true);
        when(taskRepository.findAllWithLabelsByBoardId(1L))
                .thenReturn(List.of(done, todoSecond, doing, todoFirst));

        List<TaskResponse> result = taskService.findByBoardId(1L);

        assertThat(result).extracting(TaskResponse::id).containsExactly(4L, 2L, 3L, 1L);
    }

    @Test
    @DisplayName("タスクを、画面に返す形（小文字の値・ラベルは番号の順）に変える")
    void findByIdConvertsToResponse() {
        Label meeting = withId(new Label(board, "会議", LabelColor.BLUE), 5L);
        Label document = withId(new Label(board, "資料", LabelColor.GREEN), 2L);
        Task task = withId(new Task(board, TaskStatus.DOING, 0, "会議の資料をまとめる", "説明",
                false, TaskPriority.HIGH, LocalDate.of(2026, 11, 10), Set.of(meeting, document)), 3L);
        when(taskRepository.findWithLabelsById(3L)).thenReturn(Optional.of(task));

        TaskResponse result = taskService.findById(3L);

        assertThat(result.id()).isEqualTo(3L);
        assertThat(result.boardId()).isEqualTo(1L);
        assertThat(result.status()).isEqualTo("doing");
        assertThat(result.priority()).isEqualTo("high");
        assertThat(result.dueDate()).isEqualTo(LocalDate.of(2026, 11, 10));
        assertThat(result.completed()).isFalse();
        assertThat(result.labels()).extracting(LabelResponse::id).containsExactly(2L, 5L);
        assertThat(result.labels()).extracting(LabelResponse::color).containsExactly("green", "blue");
    }

    @Test
    @DisplayName("優先度と期限がないタスクは、どちらも null で返す")
    void findByIdKeepsEmptyValuesAsNull() {
        Task task = withId(new Task(board, TaskStatus.TODO, 0, "掃除", null,
                false, null, null, Set.of()), 7L);
        when(taskRepository.findWithLabelsById(7L)).thenReturn(Optional.of(task));

        TaskResponse result = taskService.findById(7L);

        assertThat(result.priority()).isNull();
        assertThat(result.dueDate()).isNull();
        assertThat(result.labels()).isEmpty();
    }

    @Test
    @DisplayName("ないボードの全件取得は、BoardNotFoundException になる")
    void findByBoardIdThrowsWhenBoardMissing() {
        when(boardRepository.existsById(9999L)).thenReturn(false);

        assertThatThrownBy(() -> taskService.findByBoardId(9999L))
                .isInstanceOf(BoardNotFoundException.class);
        verify(taskRepository, never()).findAllWithLabelsByBoardId(anyLong());
    }

    @Test
    @DisplayName("ないタスクの1件取得は、TaskNotFoundException になる")
    void findByIdThrowsWhenTaskMissing() {
        when(taskRepository.findWithLabelsById(9999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.findById(9999L))
                .isInstanceOf(TaskNotFoundException.class);
    }

    private Task task(Long id, TaskStatus status, int position) {
        return withId(new Task(board, status, position, "タスク" + id, null,
                false, null, null, Set.of()), id);
    }

    private static <T> T withId(T entity, Long id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }
}
