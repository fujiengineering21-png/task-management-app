package com.taskboard.repository;

import com.taskboard.entity.Task;
import com.taskboard.entity.TaskStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** タスクの読み書き。 */
public interface TaskRepository extends JpaRepository<Task, Long> {

    /**
     * 1つのボードのタスクを、ラベルとまとめて1回の問い合わせで取り出す（N+1 問題を避ける）。
     * 並べ替えは service で行う（status を文字の順に並べると、未着手・作業中・完了の順にならないため）。
     */
    @Query("select t from Task t left join fetch t.labels where t.board.id = :boardId")
    List<Task> findAllWithLabelsByBoardId(@Param("boardId") Long boardId);

    /** タスク1件を、ラベルとまとめて取り出す。 */
    @Query("select t from Task t left join fetch t.labels where t.id = :id")
    Optional<Task> findWithLabelsById(@Param("id") Long id);

    /** 1つのボードのタスクの件数（上限 R-29 のチェックに使う）。 */
    @Query("select count(t) from Task t where t.board.id = :boardId")
    long countByBoardId(@Param("boardId") Long boardId);

    /** 1つのカラムの、いちばん大きい position。タスクがなければ -1。 */
    @Query("select coalesce(max(t.position), -1) from Task t where t.board.id = :boardId and t.status = :status")
    int findMaxPosition(@Param("boardId") Long boardId, @Param("status") TaskStatus status);
}
