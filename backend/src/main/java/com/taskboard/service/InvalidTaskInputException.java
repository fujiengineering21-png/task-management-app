package com.taskboard.service;

/**
 * 画面から届いたタスクの中身が正しくないことを表す。画面には 400 と、このメッセージで返す。
 * メッセージには、画面に出してよい決まった日本語の文だけを入れる（届いた値はそのまま入れない）。
 */
public class InvalidTaskInputException extends RuntimeException {

    public InvalidTaskInputException(String message) {
        super(message);
    }
}
