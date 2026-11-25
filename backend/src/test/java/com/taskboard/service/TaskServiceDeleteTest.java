package com.taskboard.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.taskboard.entity.Board;
import com.taskboard.entity.Task;
import com.taskboard.entity.TaskStatus;
import com.taskboard.repository.BoardRepository;
import com.taskboard.repository.LabelRepository;
import com.taskboard.repository.TaskRepository;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/** タスクの削除（F-12）のテスト。 */
@ExtendWith(MockitoExtension.class)
class TaskServiceDeleteTest {

    @Mock
    private BoardRepository boardRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private LabelRepository labelRepository;

    private TaskService taskService;
    private Board board;

    /** 完了のカラム：A(0)・B(1)・C(2)。B を削除する */
    private Task taskA;
    private Task taskB;
    private Task taskC;

    @BeforeEach
    void setUp() {
        taskService = new TaskService(boardRepository, taskRepository, labelRepository);
        board = withId(new Board("仕事", (short) 0), 1L);
        taskA = task(1L, 0, "A");
        taskB = task(2L, 1, "B");
        taskC = task(3L, 2, "C");

        lenient().when(taskRepository.findBoardIdById(2L)).thenReturn(Optional.of(1L));
        lenient().when(boardRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(board));
        lenient().when(taskRepository.findById(2L)).thenReturn(Optional.of(taskB));
        lenient().when(taskRepository.findAllInColumn(1L, TaskStatus.DONE))
                .thenReturn(List.of(taskA, taskC));
    }

    @Test
    @DisplayName("削除すると、同じカラムに残ったタスクを 0 から振り直してすき間を詰める（UC-03）")
    void deleteRemovesTaskAndRenumbersColumn() {
        taskService.delete(2L);

        verify(taskRepository).delete(taskB);
        assertThat(taskA.getPosition()).isZero();
        assertThat(taskC.getPosition()).isEqualTo(1);
    }

    @Test
    @DisplayName("振り直しの一覧に削除したタスク自身が入っていても、数に入れない")
    void deleteIgnoresDeletedTaskWhenRenumbering() {
        when(taskRepository.findAllInColumn(1L, TaskStatus.DONE)).thenReturn(List.of(taskA, taskB, taskC));

        taskService.delete(2L);

        assertThat(taskA.getPosition()).isZero();
        assertThat(taskC.getPosition()).isEqualTo(1);
    }

    @Test
    @DisplayName("ボードの行をロックしてから、タスクを読み直して削除する")
    void deleteLocksBoardBeforeDeleting() {
        taskService.delete(2L);

        InOrder order = inOrder(boardRepository, taskRepository);
        order.verify(taskRepository).findBoardIdById(2L);
        order.verify(boardRepository).findByIdForUpdate(1L);
        order.verify(taskRepository).findById(2L);
        order.verify(taskRepository).delete(taskB);
        order.verify(taskRepository).findAllInColumn(1L, TaskStatus.DONE);
    }

    @Test
    @DisplayName("ないタスクは TaskNotFoundException（画面は「削除できた」と扱う）")
    void deleteThrowsWhenTaskMissing() {
        when(taskRepository.findBoardIdById(9999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.delete(9999L)).isInstanceOf(TaskNotFoundException.class);
        verify(boardRepository, never()).findByIdForUpdate(any());
        verify(taskRepository, never()).delete(any());
    }

    @Test
    @DisplayName("ロックを待っている間にほかの人が削除していたら、TaskNotFoundException")
    void deleteThrowsWhenDeletedWhileWaitingForLock() {
        when(taskRepository.findById(2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.delete(2L)).isInstanceOf(TaskNotFoundException.class);
        verify(taskRepository, never()).delete(any());
        verify(taskRepository, never()).findAllInColumn(any(), any());
    }

    private Task task(Long id, int position, String title) {
        return withId(new Task(board, TaskStatus.DONE, position, title, null, true, null, null, Set.of()), id);
    }

    private static <T> T withId(T entity, Long id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }
}
