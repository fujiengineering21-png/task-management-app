package com.taskboard.repository;

import com.taskboard.entity.Board;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

/** ボードの読み書き。 */
public interface BoardRepository extends JpaRepository<Board, Long> {

    /** タブの並び順（position）どおりに、すべてのボードを取り出す。 */
    List<Board> findAllByOrderByPositionAsc();

    /**
     * ボードを1件、書き込みのロックをかけて取り出す（SELECT … FOR UPDATE の仲間）。
     * 同じボードにタスクを同時に作ったとき、片方が終わるまでもう片方を待たせる。
     * これで、件数の上限（R-29）のすり抜けや、カラム内の順番（position）の重なりを防ぐ。
     * 待つのは最大5秒。待ちきれなければ PessimisticLockingFailureException（画面には 503）。
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "5000"))
    @Query("select b from Board b where b.id = :id")
    Optional<Board> findByIdForUpdate(@Param("id") Long id);
}
