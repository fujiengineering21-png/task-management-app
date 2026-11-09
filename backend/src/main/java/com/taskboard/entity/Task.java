package com.taskboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/** タスク（tasks テーブル）。ラベルとは task_labels テーブルで結び付く。 */
@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    /** どのカラムにあるか。 */
    @Convert(converter = TaskStatusConverter.class)
    @Column(name = "status", nullable = false, length = 10)
    private TaskStatus status;

    /** カラム内の表示順（0 から）。 */
    @Column(name = "position", nullable = false)
    private Integer position;

    @Column(name = "title", nullable = false, length = 100)
    private String title;

    /** null＝説明なし。 */
    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "is_completed", nullable = false)
    private boolean completed;

    /** null＝優先度なし。 */
    @Convert(converter = TaskPriorityConverter.class)
    @Column(name = "priority", length = 10)
    private TaskPriority priority;

    /** null＝期限なし。 */
    @Column(name = "due_date")
    private LocalDate dueDate;

    @ManyToMany
    @JoinTable(
            name = "task_labels",
            joinColumns = @JoinColumn(name = "task_id"),
            inverseJoinColumns = @JoinColumn(name = "label_id"))
    private Set<Label> labels = new HashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    /** JPA が使うための、引数なしのコンストラクタ。 */
    protected Task() {
    }

    public Task(Board board, TaskStatus status, int position, String title, String description,
            boolean completed, TaskPriority priority, LocalDate dueDate, Set<Label> labels) {
        this.board = board;
        this.status = status;
        this.position = position;
        this.title = title;
        this.description = description;
        this.completed = completed;
        this.priority = priority;
        this.dueDate = dueDate;
        this.labels = new HashSet<>(labels);
    }

    public Long getId() {
        return id;
    }

    public Board getBoard() {
        return board;
    }

    public TaskStatus getStatus() {
        return status;
    }

    public Integer getPosition() {
        return position;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public boolean isCompleted() {
        return completed;
    }

    public TaskPriority getPriority() {
        return priority;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    /** 外から書き換えられないように、読み取り専用で返す。 */
    public Set<Label> getLabels() {
        return Collections.unmodifiableSet(labels);
    }
}
