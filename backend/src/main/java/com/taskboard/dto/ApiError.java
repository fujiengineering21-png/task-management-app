package com.taskboard.dto;

/**
 * エラーの中身。
 *
 * @param code    プログラムで見分けるための記号（例：TASK_NOT_FOUND）
 * @param message 画面に出してよい日本語の文（SQL やプログラムの内部情報は入れない）
 */
public record ApiError(String code, String message) {
}
