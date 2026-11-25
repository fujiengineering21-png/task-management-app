package com.taskboard.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.taskboard.dto.CreateTaskRequest;
import com.taskboard.dto.LabelResponse;
import com.taskboard.dto.TaskResponse;
import com.taskboard.entity.Board;
import com.taskboard.entity.Label;
import com.taskboard.entity.LabelColor;
import com.taskboard.entity.Task;
import com.taskboard.entity.TaskPriority;
import com.taskboard.entity.TaskStatus;
import com.taskboard.repository.BoardRepository;
import com.taskboard.repository.LabelRepository;
import com.taskboard.repository.TaskRepository;
import java.time.LocalDate;
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

/** タスクの書き換え（F-11）のテスト。 */
@ExtendWith(MockitoExtension.class)
class TaskServiceUpdateTest {

    @Mock
    private BoardRepository boardRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private LabelRepository labelRepository;

    private TaskService taskService;
    private Board board;
    private Label meeting;
    private Label document;

    /** 未着手のカラム：A(0)・B(1)・C(2)。B を書き換える */
    private Task taskA;
    private Task taskB;
    private Task taskC;

    @BeforeEach
    void setUp() {
        taskService = new TaskService(boardRepository, taskRepository, labelRepository);
        board = withId(new Board("仕事", (short) 0), 1L);
        meeting = withId(new Label(board, "会議", LabelColor.BLUE), 3L);
        document = withId(new Label(board, "資料", LabelColor.GREEN), 4L);
        taskA = task(1L, TaskStatus.TODO, 0, "A");
        taskB = withId(new Task(board, TaskStatus.TODO, 1, "B", "説明", true, TaskPriority.LOW,
                LocalDate.of(2026, 11, 1), Set.of(meeting)), 2L);
        taskC = task(3L, TaskStatus.TODO, 2, "C");

        lenient().when(taskRepository.findBoardIdById(2L)).thenReturn(Optional.of(1L));
        lenient().when(boardRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(board));
        lenient().when(taskRepository.findWithLabelsById(2L)).thenReturn(Optional.of(taskB));
        lenient().when(labelRepository.findAllByBoardId(1L)).thenReturn(List.of(meeting, document));
        lenient().when(taskRepository.findMaxPosition(1L, TaskStatus.DOING)).thenReturn(1);
        lenient().when(taskRepository.findAllInColumn(1L, TaskStatus.TODO))
                .thenReturn(List.of(taskA, taskC));
    }

    @Test
    @DisplayName("カラムを変えないときは、中身だけを置き換え、順番（position）とチェックはそのまま")
    void updateKeepsPositionWhenColumnUnchanged() {
        TaskResponse result = taskService.update(2L, new CreateTaskRequest(
                "  B を書き換えた  ", "  ", "todo", "high", LocalDate.of(2026, 11, 30), List.of(4L)));

        assertThat(result.id()).isEqualTo(2L);
        assertThat(result.status()).isEqualTo("todo");
        assertThat(result.position()).isEqualTo(1);
        assertThat(result.title()).isEqualTo("B を書き換えた");
        assertThat(result.description()).isNull();
        assertThat(result.priority()).isEqualTo("high");
        assertThat(result.dueDate()).isEqualTo(LocalDate.of(2026, 11, 30));
        assertThat(result.completed()).isTrue();
        assertThat(result.labels()).extracting(LabelResponse::id).containsExactly(4L);
        verify(taskRepository, never()).findAllInColumn(any(), any());
    }

    @Test
    @DisplayName("カラムを変えたら移動先の一番下に入れ、移動元は 0 から振り直してすき間を詰める（R-04）")
    void updateMovesToBottomAndRenumbersSourceColumn() {
        TaskResponse result = taskService.update(2L, request("B", "doing"));

        assertThat(result.status()).isEqualTo("doing");
        assertThat(result.position()).isEqualTo(2);
        assertThat(taskA.getPosition()).isZero();
        assertThat(taskC.getPosition()).isEqualTo(1);
    }

    @Test
    @DisplayName("移動先が空のカラムなら、position は 0 になる")
    void updateMovesIntoEmptyColumn() {
        when(taskRepository.findMaxPosition(1L, TaskStatus.DONE)).thenReturn(-1);

        TaskResponse result = taskService.update(2L, request("B", "done"));

        assertThat(result.status()).isEqualTo("done");
        assertThat(result.position()).isZero();
    }

    @Test
    @DisplayName("振り直しの一覧に動かしたタスク自身が入っていても、数に入れない")
    void updateIgnoresMovedTaskWhenRenumbering() {
        when(taskRepository.findAllInColumn(1L, TaskStatus.TODO)).thenReturn(List.of(taskA, taskB, taskC));

        TaskResponse result = taskService.update(2L, request("B", "doing"));

        assertThat(result.position()).isEqualTo(2);
        assertThat(taskA.getPosition()).isZero();
        assertThat(taskC.getPosition()).isEqualTo(1);
    }

    @Test
    @DisplayName("ボードの行をロックしてから、タスクを読み直す（同時の書き込みで順番が重ならないため）")
    void updateLocksBoardBeforeReadingTask() {
        taskService.update(2L, request("B", "doing"));

        InOrder order = inOrder(boardRepository, taskRepository);
        order.verify(taskRepository).findBoardIdById(2L);
        order.verify(boardRepository).findByIdForUpdate(1L);
        order.verify(taskRepository).findWithLabelsById(2L);
        order.verify(taskRepository).findMaxPosition(1L, TaskStatus.DOING);
        order.verify(taskRepository).findAllInColumn(1L, TaskStatus.TODO);
    }

    @Test
    @DisplayName("ないタスクは TaskNotFoundException")
    void updateThrowsWhenTaskMissing() {
        when(taskRepository.findBoardIdById(9999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.update(9999L, request("B", "todo")))
                .isInstanceOf(TaskNotFoundException.class);
        verify(boardRepository, never()).findByIdForUpdate(any());
    }

    @Test
    @DisplayName("ロックを待っている間にほかの人が削除していたら、TaskNotFoundException（R-28）")
    void updateThrowsWhenTaskDeletedWhileWaitingForLock() {
        when(taskRepository.findWithLabelsById(2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.update(2L, request("B", "doing")))
                .isInstanceOf(TaskNotFoundException.class);
        verify(taskRepository, never()).findAllInColumn(any(), any());
    }

    @Test
    @DisplayName("入力が正しくなければ、データベースを見る前に断る（チェックの中身は作成と同じ）")
    void updateRejectsInvalidInputFirst() {
        assertThatThrownBy(() -> taskService.update(2L, request("   ", "todo")))
                .isInstanceOf(InvalidTaskInputException.class)
                .hasMessage("タイトルを入力してください");
        verify(taskRepository, never()).findBoardIdById(any());
    }

    @Test
    @DisplayName("ほかのボードのラベルは付けられない。中身は書き換えない")
    void updateRejectsLabelOfOtherBoard() {
        assertThatThrownBy(() -> taskService.update(2L, new CreateTaskRequest(
                "B を書き換えた", null, "doing", null, null, List.of(99L))))
                .isInstanceOf(InvalidTaskInputException.class)
                .hasMessage("選べないラベルが含まれています");
        assertThat(taskB.getTitle()).isEqualTo("B");
        assertThat(taskB.getStatus()).isEqualTo(TaskStatus.TODO);
        assertThat(taskA.getPosition()).isZero();
        assertThat(taskC.getPosition()).isEqualTo(2);
    }

    private Task task(Long id, TaskStatus status, int position, String title) {
        return withId(new Task(board, status, position, title, null, false, null, null, Set.of()), id);
    }

    private static CreateTaskRequest request(String title, String status) {
        return new CreateTaskRequest(title, null, status, null, null, null);
    }

    private static <T> T withId(T entity, Long id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }
}
