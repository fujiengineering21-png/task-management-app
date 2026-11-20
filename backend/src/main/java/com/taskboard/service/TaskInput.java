package com.taskboard.service;

import com.taskboard.dto.CreateTaskRequest;
import com.taskboard.entity.TaskPriority;
import com.taskboard.entity.TaskStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * 画面から届いた中身を、チェックして整えたもの（R-03, R-05, R-06）。
 * 前後の空白を取ってから文字数を数える。文字数は、データベース（VARCHAR）と同じく1文字ずつ数える（絵文字も1文字）。
 */
record TaskInput(
        String title,
        String description,
        TaskStatus status,
        TaskPriority priority,
        LocalDate dueDate,
        Set<Long> labelIds) {

    static final int TITLE_MAX_LENGTH = 100;
    static final int DESCRIPTION_MAX_LENGTH = 1000;
    /** 1つのボードのラベルの最大数（R-17）。これより多い番号は、そもそも選べない。 */
    static final int LABEL_IDS_MAX = 20;
    /** 期限に選べる日付の範囲。PostgreSQL の DATE や画面の日付入力が扱えない極端な年を防ぐ。 */
    static final LocalDate DUE_DATE_MIN = LocalDate.of(1900, 1, 1);
    static final LocalDate DUE_DATE_MAX = LocalDate.of(9999, 12, 31);
    static final String INVALID_LABEL_MESSAGE = "選べないラベルが含まれています";

    /** 中身をチェックして整える。正しくなければ InvalidTaskInputException。 */
    static TaskInput from(CreateTaskRequest request) {
        return new TaskInput(
                title(request.title()),
                description(request.description()),
                status(request.status()),
                priority(request.priority()),
                dueDate(request.dueDate()),
                labelIds(request.labelIds()));
    }

    private static String title(String raw) {
        String title = raw == null ? "" : raw.strip();
        if (title.isEmpty()) {
            throw new InvalidTaskInputException("タイトルを入力してください");
        }
        rejectNul(title);
        if (length(title) > TITLE_MAX_LENGTH) {
            throw new InvalidTaskInputException("タイトルは" + TITLE_MAX_LENGTH + "文字までです");
        }
        return title;
    }

    /** 空白だけの説明は「説明なし」（null）にする。 */
    private static String description(String raw) {
        String description = raw == null ? "" : raw.strip();
        if (description.isEmpty()) {
            return null;
        }
        if (length(description) > DESCRIPTION_MAX_LENGTH) {
            throw new InvalidTaskInputException("説明は" + DESCRIPTION_MAX_LENGTH + "文字までです");
        }
        rejectNul(description);
        return description;
    }

    /** NUL 文字（\u0000）は PostgreSQL の文字の列に入れられず、保存で 500 になるため、先にはじく。 */
    private static void rejectNul(String text) {
        if (text.indexOf('\u0000') >= 0) {
            throw new InvalidTaskInputException("使えない文字が含まれています");
        }
    }

    private static LocalDate dueDate(LocalDate raw) {
        if (raw != null && (raw.isBefore(DUE_DATE_MIN) || raw.isAfter(DUE_DATE_MAX))) {
            throw new InvalidTaskInputException("期限の日付が正しくありません");
        }
        return raw;
    }

    private static TaskStatus status(String raw) {
        if (raw == null) {
            throw new InvalidTaskInputException("カラムを選んでください");
        }
        try {
            return TaskStatus.fromValue(raw);
        } catch (IllegalArgumentException e) {
            throw new InvalidTaskInputException("カラムの値が正しくありません");
        }
    }

    private static TaskPriority priority(String raw) {
        if (raw == null) {
            return null;
        }
        try {
            return TaskPriority.fromValue(raw);
        } catch (IllegalArgumentException e) {
            throw new InvalidTaskInputException("優先度の値が正しくありません");
        }
    }

    /** 同じ番号が2回あっても1つにまとめる。null が混ざっている・多すぎるときは正しくない。 */
    private static Set<Long> labelIds(List<Long> raw) {
        if (raw == null) {
            return Set.of();
        }
        if (raw.size() > LABEL_IDS_MAX || raw.stream().anyMatch(Objects::isNull)) {
            throw new InvalidTaskInputException(INVALID_LABEL_MESSAGE);
        }
        return Set.copyOf(raw);
    }

    private static int length(String text) {
        return text.codePointCount(0, text.length());
    }
}
