package com.taskboard.entity;

/** ラベルの色（6色）。 */
public enum LabelColor {
    GREEN("green"),
    YELLOW("yellow"),
    ORANGE("orange"),
    RED("red"),
    PURPLE("purple"),
    BLUE("blue");

    private final String value;

    LabelColor(String value) {
        this.value = value;
    }

    /** データベースと API で使う小文字の値。 */
    public String getValue() {
        return value;
    }

    public static LabelColor fromValue(String value) {
        for (LabelColor color : values()) {
            if (color.value.equals(value)) {
                return color;
            }
        }
        throw new IllegalArgumentException("不明な color です: " + value);
    }
}
