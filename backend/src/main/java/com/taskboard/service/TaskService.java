package com.taskboard.service;

import com.taskboard.dto.TaskResponse;
import com.taskboard.entity.Task;
import com.taskboard.repository.BoardRepository;
import com.taskboard.repository.TaskRepository;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * タスクについてのルールと処理。
 * open-in-view=false なので、データベースからの取り出しと画面用の形への変換は、このクラスの中で済ませる。
 */
@Service
@Transactional(readOnly = true)
public class TaskService {

    /** 未着手 → 作業中 → 完了（TaskStatus の宣言順）。カラムの中は position の順、同じなら番号の順。 */
    private static final Comparator<Task> BOARD_ORDER = Comparator
            .comparing(Task::getStatus)
            .thenComparing(Task::getPosition)
            .thenComparing(Task::getId);

    private final BoardRepository boardRepository;
    private final TaskRepository taskRepository;

    public TaskService(BoardRepository boardRepository, TaskRepository taskRepository) {
        this.boardRepository = boardRepository;
        this.taskRepository = taskRepository;
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
}
