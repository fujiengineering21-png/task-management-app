package com.taskboard.dto;

import com.taskboard.entity.Label;
import com.taskboard.entity.Task;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

/**
 * API で返すタスクの形。
 * status・priority は小文字の値（todo・high など）。priority・dueDate・description は、ないとき null。
 * dueDate は Java では LocalDate、JSON では "2026-11-10" の形の文字列になる。
 */
public record TaskResponse(
        Long id,
        Long boardId,
        String status,
        Integer position,
        String title,
        String description,
        boolean completed,
        String priority,
        LocalDate dueDate,
        List<LabelResponse> labels) {

    public static TaskResponse from(Task task) {
        List<LabelResponse> labels = task.getLabels().stream()
                .sorted(Comparator.comparing(Label::getId))
                .map(LabelResponse::from)
                .toList();
        return new TaskResponse(
                task.getId(),
                task.getBoard().getId(),
                task.getStatus().getValue(),
                task.getPosition(),
                task.getTitle(),
                task.getDescription(),
                task.isCompleted(),
                task.getPriority() == null ? null : task.getPriority().getValue(),
                task.getDueDate(),
                labels);
    }
}
