package com.taskboard.repository;

import com.taskboard.entity.Label;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** ラベルの読み書き。 */
public interface LabelRepository extends JpaRepository<Label, Long> {

    /** 1つのボードのラベルを、番号の順に取り出す。 */
    @Query("select l from Label l where l.board.id = :boardId order by l.id")
    List<Label> findAllByBoardId(@Param("boardId") Long boardId);
}
