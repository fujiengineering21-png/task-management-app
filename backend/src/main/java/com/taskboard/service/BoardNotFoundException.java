package com.taskboard.service;

/** 指定された番号のボードがないことを表す。画面には 404 と日本語のメッセージで返す。 */
public class BoardNotFoundException extends RuntimeException {

    public BoardNotFoundException(Long boardId) {
        super("ボードが見つかりません（id=" + boardId + "）");
    }
}
