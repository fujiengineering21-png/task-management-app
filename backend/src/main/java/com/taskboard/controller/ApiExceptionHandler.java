package com.taskboard.controller;

import com.taskboard.dto.ApiError;
import com.taskboard.dto.ApiResponse;
import com.taskboard.service.BoardNotFoundException;
import com.taskboard.service.TaskNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * エラーを、共通の包み（success=false）と日本語のメッセージに変える（N-17）。
 * 画面には SQL やプログラムの内部情報を出さず、予想外のエラーの詳しい内容はログにだけ残す。
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(TaskNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleTaskNotFound(TaskNotFoundException ex) {
        return failure(HttpStatus.NOT_FOUND, new HttpHeaders(),
                new ApiError("TASK_NOT_FOUND", "タスクが見つかりません"));
    }

    @ExceptionHandler(BoardNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleBoardNotFound(BoardNotFoundException ex) {
        return failure(HttpStatus.NOT_FOUND, new HttpHeaders(),
                new ApiError("BOARD_NOT_FOUND", "ボードが見つかりません"));
    }

    /** URL の番号が数字でないとき（例：/api/tasks/abc）。 */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return failure(HttpStatus.BAD_REQUEST, new HttpHeaders(),
                new ApiError("INVALID_ID", "番号の形が正しくありません"));
    }

    /** 画面を閉じたなどで、相手との接続が切れたとき。返事は届かないので、何も返さず、エラーとしても記録しない。 */
    @ExceptionHandler(AsyncRequestNotUsableException.class)
    public void handleClientDisconnect(AsyncRequestNotUsableException ex) {
        log.debug("相手との接続が切れたので、返事を送りませんでした: {}", ex.getMessage());
    }

    /**
     * それ以外のすべて。ない URL（404）や使えないメソッド（405）など、Spring が状態コードを決めているものは
     * その番号のまま返す（500 にしない）。予想外のエラーだけを 500 にして、詳しい内容をログに残す。
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleOthers(Exception ex) {
        if (ex instanceof ErrorResponse errorResponse) {
            HttpStatusCode status = errorResponse.getStatusCode();
            if (status.is5xxServerError()) {
                log.error("サーバー側でエラーが起きました", ex);
            }
            return failure(status, allowHeaderOnly(errorResponse.getHeaders()), errorFor(status));
        }
        log.error("予想外のエラーが起きました", ex);
        return failure(HttpStatus.INTERNAL_SERVER_ERROR, new HttpHeaders(),
                new ApiError("INTERNAL_ERROR", "サーバーでエラーが起きました"));
    }

    private static ApiError errorFor(HttpStatusCode status) {
        return switch (status.value()) {
            case 404 -> new ApiError("NOT_FOUND", "指定された URL は見つかりません");
            case 405 -> new ApiError("METHOD_NOT_ALLOWED", "この URL では使えない操作です");
            default -> status.is4xxClientError()
                    ? new ApiError("BAD_REQUEST", "リクエストの形が正しくありません")
                    : new ApiError("INTERNAL_ERROR", "サーバーでエラーが起きました");
        };
    }

    /** Spring が用意したヘッダーのうち、使えるメソッドを知らせる Allow だけを通す（405 のとき）。 */
    private static HttpHeaders allowHeaderOnly(HttpHeaders source) {
        HttpHeaders headers = new HttpHeaders();
        if (!source.getAllow().isEmpty()) {
            headers.setAllow(source.getAllow());
        }
        return headers;
    }

    private static ResponseEntity<ApiResponse<Void>> failure(
            HttpStatusCode status, HttpHeaders headers, ApiError error) {
        return ResponseEntity.status(status)
                .headers(headers)
                .body(ApiResponse.fail(error));
    }
}
