package com.taskboard.service;

import com.taskboard.dto.CreateTaskRequest;
import com.taskboard.dto.TaskResponse;
import com.taskboard.entity.Board;
import com.taskboard.entity.Label;
import com.taskboard.entity.Task;
import com.taskboard.repository.BoardRepository;
import com.taskboard.repository.LabelRepository;
import com.taskboard.repository.TaskRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * タスクについてのルールと処理。
 * open-in-view=false なので、データベースからの取り出しと画面用の形への変換は、このクラスの中で済ませる。
 */
@Service
@Transactional(readOnly = true)
public class TaskService {

    /** 1つのボードに作れるタスクの数（R-29）。 */
    static final int MAX_TASKS_PER_BOARD = 200;

    /** 未着手 → 作業中 → 完了（TaskStatus の宣言順）。カラムの中は position の順、同じなら番号の順。 */
    private static final Comparator<Task> BOARD_ORDER = Comparator
            .comparing(Task::getStatus)
            .thenComparing(Task::getPosition)
            .thenComparing(Task::getId);

    private final BoardRepository boardRepository;
    private final TaskRepository taskRepository;
    private final LabelRepository labelRepository;

    public TaskService(BoardRepository boardRepository, TaskRepository taskRepository,
            LabelRepository labelRepository) {
        this.boardRepository = boardRepository;
        this.taskRepository = taskRepository;
        this.labelRepository = labelRepository;
    }

    /** 1つのボードのタスクを、画面に並べる順番で全部返す。ボードがなければ BoardNotFoundException。 */
    public List<TaskResponse> findByBoardId(Long boardId) {
        if (!boardRepository.existsById(boardId)) {
            throw new BoardNotFoundException(boardId);
        }
        return taskRepository.findAllWithLabelsByBoardId(boardId).stream()
                .sorted(BOARD_ORDER)
                .map(TaskResponse::from)
                .toList();
    }

    /** タスクを1件返す。なければ TaskNotFoundException。 */
    public TaskResponse findById(Long taskId) {
        return taskRepository.findWithLabelsById(taskId)
                .map(TaskResponse::from)
                .orElseThrow(() -> new TaskNotFoundException(taskId));
    }

    /**
     * タスクを作って、選んだカラムの一番下に入れる（F-10, R-01）。番号（id）はデータベースが付ける。
     * 順番：中身のチェック → ボードをロック → 件数の上限 → ラベルのチェック → position を決めて保存。
     * 全部を1つのトランザクションで行い、ロックは保存が終わるまで続く。
     *
     * @throws InvalidTaskInputException 中身が正しくない
     * @throws BoardNotFoundException    ボードがない
     * @throws TaskLimitExceededException ボードのタスクが上限に達している
     */
    @Transactional
    public TaskResponse create(Long boardId, CreateTaskRequest request) {
        TaskInput input = TaskInput.from(request);
        Board board = boardRepository.findByIdForUpdate(boardId)
                .orElseThrow(() -> new BoardNotFoundException(boardId));
        if (taskRepository.countByBoardId(boardId) >= MAX_TASKS_PER_BOARD) {
            throw new TaskLimitExceededException(boardId);
        }
        Set<Label> labels = labelsOfBoard(boardId, input.labelIds());
        int position = taskRepository.findMaxPosition(boardId, input.status()) + 1;

        Task task = new Task(board, input.status(), position, input.title(), input.description(),
                false, input.priority(), input.dueDate(), labels);
        return TaskResponse.from(taskRepository.save(task));
    }

    /** 番号のラベルを取り出す。そのボードのラベルでない番号が1つでもあれば InvalidTaskInputException。 */
    private Set<Label> labelsOfBoard(Long boardId, Set<Long> labelIds) {
        if (labelIds.isEmpty()) {
            return Set.of();
        }
        Map<Long, Label> boardLabels = labelRepository.findAllByBoardId(boardId).stream()
                .collect(Collectors.toMap(Label::getId, Function.identity()));
        if (!boardLabels.keySet().containsAll(labelIds)) {
            throw new InvalidTaskInputException(TaskInput.INVALID_LABEL_MESSAGE);
        }
        return labelIds.stream().map(boardLabels::get).collect(Collectors.toUnmodifiableSet());
    }
}
