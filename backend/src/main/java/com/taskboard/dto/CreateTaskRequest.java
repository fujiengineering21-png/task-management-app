package com.taskboard.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * タスクを作るときに画面から届く中身（POST /api/boards/{boardId}/tasks）。
 * id・position・completed は受け取らない（id はデータベース、position はサーバーが決める。新しいタスクは未チェック）。
 * 中身のチェックは TaskService で行う（前後の空白を取ってから文字数を数えるため）。
 *
 * @param title       タイトル（必須）
 * @param description 説明（null か空白だけなら「説明なし」）
 * @param status      カラム（todo・doing・done）
 * @param priority    優先度（high・medium・low。null＝なし）
 * @param dueDate     期限（"2026-11-25" の形。null＝なし）
 * @param labelIds    付けるラベルの番号（同じボードのものだけ。null＝なし）
 */
public record CreateTaskRequest(
        String title,
        String description,
        String status,
        String priority,
        LocalDate dueDate,
        List<Long> labelIds) {
}
