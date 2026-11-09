package com.taskboard.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** TaskStatus と、データベースの小文字の値（todo など）を変換する。 */
@Converter
public class TaskStatusConverter implements AttributeConverter<TaskStatus, String> {

    @Override
    public String convertToDatabaseColumn(TaskStatus status) {
        return status == null ? null : status.getValue();
    }

    @Override
    public TaskStatus convertToEntityAttribute(String value) {
        return value == null ? null : TaskStatus.fromValue(value);
    }
}
