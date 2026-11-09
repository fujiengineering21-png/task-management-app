package com.taskboard.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** TaskPriority と、データベースの小文字の値（high など）を変換する。null は null のまま。 */
@Converter
public class TaskPriorityConverter implements AttributeConverter<TaskPriority, String> {

    @Override
    public String convertToDatabaseColumn(TaskPriority priority) {
        return priority == null ? null : priority.getValue();
    }

    @Override
    public TaskPriority convertToEntityAttribute(String value) {
        return value == null ? null : TaskPriority.fromValue(value);
    }
}
