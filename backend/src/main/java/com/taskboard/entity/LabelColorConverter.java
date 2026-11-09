package com.taskboard.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** LabelColor と、データベースの小文字の値（red など）を変換する。 */
@Converter
public class LabelColorConverter implements AttributeConverter<LabelColor, String> {

    @Override
    public String convertToDatabaseColumn(LabelColor color) {
        return color == null ? null : color.getValue();
    }

    @Override
    public LabelColor convertToEntityAttribute(String value) {
        return value == null ? null : LabelColor.fromValue(value);
    }
}
