package com.taskboard.dto;

/**
 * API の返事の共通の包み。成功でも失敗でも、この4つの項目で返す。
 *
 * @param success 成功したか
 * @param data    返すデータ（失敗のときは null）
 * @param error   エラーの中身（成功のときは null）
 * @param meta    件数などの補足（今は使わず null）
 */
public record ApiResponse<T>(boolean success, T data, ApiError error, Object meta) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null, null);
    }

    public static ApiResponse<Void> fail(ApiError error) {
        return new ApiResponse<>(false, null, error, null);
    }
}
