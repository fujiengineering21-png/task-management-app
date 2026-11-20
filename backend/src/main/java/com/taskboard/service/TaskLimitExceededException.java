package com.taskboard.service;

/** ボードのタスクが上限（R-29）に達していて、これ以上作れないことを表す。画面には 409 で返す。 */
public class TaskLimitExceededException extends RuntimeException {

    public TaskLimitExceededException(Long boardId) {
        super("ボードのタスクが上限に達しています（id=" + boardId + "）");
    }
}
