package com.taskboard.entity;

/** タスクの優先度。優先度なしは null で表す。 */
public enum TaskPriority {
    HIGH("high"),
    MEDIUM("medium"),
    LOW("low");

    private final String value;

    TaskPriority(String value) {
        this.value = value;
    }

    /** データベースと API で使う小文字の値。 */
    public String getValue() {
        return value;
    }

    public static TaskPriority fromValue(String value) {
        for (TaskPriority priority : values()) {
            if (priority.value.equals(value)) {
                return priority;
            }
        }
        throw new IllegalArgumentException("不明な priority です: " + value);
    }
}
