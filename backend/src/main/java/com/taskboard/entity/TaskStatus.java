package com.taskboard.entity;

/**
 * タスクがどのカラムにあるか。宣言の順番が、画面に並べる順番（未着手 → 作業中 → 完了）になる。
 */
public enum TaskStatus {
    TODO("todo"),
    DOING("doing"),
    DONE("done");

    private final String value;

    TaskStatus(String value) {
        this.value = value;
    }

    /** データベースと API で使う小文字の値。 */
    public String getValue() {
        return value;
    }

    public static TaskStatus fromValue(String value) {
        for (TaskStatus status : values()) {
            if (status.value.equals(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("不明な status です: " + value);
    }
}
