package com.taskboard.service;

/** 指定された番号のタスクがないことを表す。画面には 404 と日本語のメッセージで返す。 */
public class TaskNotFoundException extends RuntimeException {

    public TaskNotFoundException(Long taskId) {
        super("タスクが見つかりません（id=" + taskId + "）");
    }
}
