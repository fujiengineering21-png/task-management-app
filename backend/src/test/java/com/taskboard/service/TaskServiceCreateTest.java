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
import com.taskboard.entity.TaskStatus;
import com.taskboard.repository.BoardRepository;
import com.taskboard.repository.LabelRepository;
import com.taskboard.repository.TaskRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.LongStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/** タスクの作成（F-10）のテスト。 */
@ExtendWith(MockitoExtension.class)
class TaskServiceCreateTest {

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

    @BeforeEach
    void setUp() {
        taskService = new TaskService(boardRepository, taskRepository, labelRepository);
        board = withId(new Board("仕事", (short) 0), 1L);
        meeting = withId(new Label(board, "会議", LabelColor.BLUE), 3L);
        document = withId(new Label(board, "資料", LabelColor.GREEN), 4L);
        lenient().when(boardRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(board));
        lenient().when(labelRepository.findAllByBoardId(1L)).thenReturn(List.of(meeting, document));
        lenient().when(taskRepository.countByBoardId(1L)).thenReturn(7L);
        lenient().when(taskRepository.findMaxPosition(1L, TaskStatus.TODO)).thenReturn(2);
        lenient().when(taskRepository.save(any(Task.class)))
                .thenAnswer(invocation -> withId(invocation.getArgument(0, Task.class), 14L));
    }

    @Test
    @DisplayName("作成すると、選んだカラムの一番下（最大の position＋1）に入り、番号付きで返す")
    void createPutsTaskAtBottomOfColumn() {
        TaskResponse result = taskService.create(1L, new CreateTaskRequest(
                "資料を印刷する", "会議の前に10部", "todo", "high",
                LocalDate.of(2026, 11, 25), List.of(4L, 3L)));

        assertThat(result.id()).isEqualTo(14L);
        assertThat(result.boardId()).isEqualTo(1L);
        assertThat(result.status()).isEqualTo("todo");
        assertThat(result.position()).isEqualTo(3);
        assertThat(result.title()).isEqualTo("資料を印刷する");
        assertThat(result.description()).isEqualTo("会議の前に10部");
        assertThat(result.completed()).isFalse();
        assertThat(result.priority()).isEqualTo("high");
        assertThat(result.dueDate()).isEqualTo(LocalDate.of(2026, 11, 25));
        assertThat(result.labels()).extracting(LabelResponse::id).containsExactly(3L, 4L);
    }

    @Test
    @DisplayName("空のカラムに作ると、position は 0 になる")
    void createInEmptyColumnStartsAtZero() {
        when(taskRepository.findMaxPosition(1L, TaskStatus.DONE)).thenReturn(-1);

        TaskResponse result = taskService.create(1L, request("買い物", "done"));

        assertThat(result.position()).isZero();
    }

    @Test
    @DisplayName("タイトルと説明の前後の空白を取り除き、空白だけの説明は「説明なし」（null）にする")
    void createStripsWhitespace() {
        TaskResponse result = taskService.create(1L, new CreateTaskRequest(
                "　 資料を印刷する \n", "   ", "todo", null, null, null));

        assertThat(result.title()).isEqualTo("資料を印刷する");
        assertThat(result.description()).isNull();
        assertThat(result.priority()).isNull();
        assertThat(result.dueDate()).isNull();
        assertThat(result.labels()).isEmpty();
    }

    @Test
    @DisplayName("同じラベルが2回送られても、1つとして付ける")
    void createIgnoresDuplicateLabelIds() {
        TaskResponse result = taskService.create(1L, new CreateTaskRequest(
                "資料を印刷する", null, "todo", null, null, List.of(3L, 3L)));

        assertThat(result.labels()).extracting(LabelResponse::id).containsExactly(3L);
    }

    @Test
    @DisplayName("タイトルが空、または空白だけなら作らない")
    void createRejectsBlankTitle() {
        assertInvalid(request(null, "todo"), "タイトルを入力してください");
        assertInvalid(request("  　 ", "todo"), "タイトルを入力してください");
    }

    @Test
    @DisplayName("タイトルは100文字なら作れる。前後の空白は数えない")
    void createAcceptsHundredCharacterTitle() {
        String hundred = "あ".repeat(100);

        TaskResponse result = taskService.create(1L, request("  " + hundred + "  ", "todo"));

        assertThat(result.title()).isEqualTo(hundred);
    }

    @Test
    @DisplayName("タイトルが101文字なら作らない")
    void createRejectsTooLongTitle() {
        assertInvalid(request("あ".repeat(101), "todo"), "タイトルは100文字までです");
    }

    @Test
    @DisplayName("説明は1000文字まで")
    void createChecksDescriptionLength() {
        assertInvalid(new CreateTaskRequest("タイトル", "あ".repeat(1001), "todo", null, null, null),
                "説明は1000文字までです");
    }

    @Test
    @DisplayName("カラムがない、または決まった値でなければ作らない")
    void createRejectsInvalidStatus() {
        assertInvalid(request("タイトル", null), "カラムを選んでください");
        assertInvalid(request("タイトル", "archived"), "カラムの値が正しくありません");
    }

    @Test
    @DisplayName("優先度が決まった値でなければ作らない")
    void createRejectsInvalidPriority() {
        assertInvalid(new CreateTaskRequest("タイトル", null, "todo", "urgent", null, null),
                "優先度の値が正しくありません");
    }

    @Test
    @DisplayName("ほかのボードのラベルや、ないラベルは付けられない")
    void createRejectsLabelOfOtherBoard() {
        assertInvalid(new CreateTaskRequest("タイトル", null, "todo", null, null, List.of(3L, 99L)),
                "選べないラベルが含まれています");
    }

    @Test
    @DisplayName("ラベルの番号に null が入っていたら作らない")
    void createRejectsNullLabelId() {
        List<Long> withNull = new ArrayList<>();
        withNull.add(null);

        assertInvalid(new CreateTaskRequest("タイトル", null, "todo", null, null, withNull),
                "選べないラベルが含まれています");
    }

    @Test
    @DisplayName("タイトルや説明に NUL 文字（データベースに入れられない文字）があれば作らない")
    void createRejectsNulCharacter() {
        assertInvalid(request("資料\u0000印刷", "todo"), "使えない文字が含まれています");
        assertInvalid(new CreateTaskRequest("タイトル", "説明\u0000", "todo", null, null, null),
                "使えない文字が含まれています");
    }

    @Test
    @DisplayName("期限は 1900-01-01 から 9999-12-31 まで")
    void createChecksDueDateRange() {
        assertInvalid(new CreateTaskRequest("タイトル", null, "todo", null, LocalDate.of(10000, 1, 1), null),
                "期限の日付が正しくありません");
        assertInvalid(new CreateTaskRequest("タイトル", null, "todo", null, LocalDate.of(1899, 12, 31), null),
                "期限の日付が正しくありません");
    }

    @Test
    @DisplayName("期限は範囲の端の日付なら作れる（過去の日付も選べる R-11）")
    void createAcceptsDueDateAtRangeEdges() {
        assertThat(taskService.create(1L, new CreateTaskRequest("タイトル", null, "todo", null,
                LocalDate.of(1900, 1, 1), null)).dueDate()).isEqualTo(LocalDate.of(1900, 1, 1));
        assertThat(taskService.create(1L, new CreateTaskRequest("タイトル", null, "todo", null,
                LocalDate.of(9999, 12, 31), null)).dueDate()).isEqualTo(LocalDate.of(9999, 12, 31));
    }

    @Test
    @DisplayName("ラベルの番号が21個以上なら作らない（1つのボードのラベルは最大20個 R-17）")
    void createRejectsTooManyLabelIds() {
        List<Long> many = LongStream.rangeClosed(1, 21).boxed().toList();

        assertInvalid(new CreateTaskRequest("タイトル", null, "todo", null, null, many),
                "選べないラベルが含まれています");
    }

    @Test
    @DisplayName("ないボードには作れない")
    void createThrowsWhenBoardMissing() {
        when(boardRepository.findByIdForUpdate(9999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.create(9999L, request("タイトル", "todo")))
                .isInstanceOf(BoardNotFoundException.class);
        verify(taskRepository, never()).save(any());
    }

    @Test
    @DisplayName("ボードのタスクが200件あれば作らない。199件なら作れる")
    void createRejectsWhenBoardIsFull() {
        when(taskRepository.countByBoardId(1L)).thenReturn(200L);

        assertThatThrownBy(() -> taskService.create(1L, request("タイトル", "todo")))
                .isInstanceOf(TaskLimitExceededException.class);
        verify(taskRepository, never()).save(any());

        when(taskRepository.countByBoardId(1L)).thenReturn(199L);
        assertThat(taskService.create(1L, request("タイトル", "todo")).id()).isEqualTo(14L);
    }

    @Test
    @DisplayName("件数を数える前に、ボードの行をロックする（同時の作成で上限をすり抜けないため）")
    void createLocksBoardBeforeCounting() {
        taskService.create(1L, request("タイトル", "todo"));

        InOrder order = inOrder(boardRepository, taskRepository);
        order.verify(boardRepository).findByIdForUpdate(1L);
        order.verify(taskRepository).countByBoardId(1L);
        ArgumentCaptor<Task> saved = ArgumentCaptor.forClass(Task.class);
        order.verify(taskRepository).save(saved.capture());
        assertThat(saved.getValue().isCompleted()).isFalse();
    }

    private void assertInvalid(CreateTaskRequest request, String message) {
        assertThatThrownBy(() -> taskService.create(1L, request))
                .isInstanceOf(InvalidTaskInputException.class)
                .hasMessage(message);
        verify(taskRepository, never()).save(any());
    }

    private static CreateTaskRequest request(String title, String status) {
        return new CreateTaskRequest(title, null, status, null, null, null);
    }

    private static <T> T withId(T entity, Long id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }
}
