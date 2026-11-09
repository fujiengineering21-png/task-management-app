package com.taskboard.repository;

import com.taskboard.entity.Label;
import org.springframework.data.jpa.repository.JpaRepository;

/** ラベルの読み書き。 */
public interface LabelRepository extends JpaRepository<Label, Long> {
}
