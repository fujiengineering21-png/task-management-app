package com.taskboard.dto;

import com.taskboard.entity.Label;

/** API で返すラベルの形。color は小文字の値（red など）。 */
public record LabelResponse(Long id, String name, String color) {

    public static LabelResponse from(Label label) {
        return new LabelResponse(label.getId(), label.getName(), label.getColor().getValue());
    }
}
