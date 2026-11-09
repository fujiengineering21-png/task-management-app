package com.taskboard.repository;

import com.taskboard.entity.Board;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/** ボードの読み書き。 */
public interface BoardRepository extends JpaRepository<Board, Long> {

    /** タブの並び順（position）どおりに、すべてのボードを取り出す。 */
    List<Board> findAllByOrderByPositionAsc();
}
