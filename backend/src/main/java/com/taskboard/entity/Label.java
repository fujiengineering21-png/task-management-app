package com.taskboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/** ラベル（labels テーブル）。ボードごとに持つ。 */
@Entity
@Table(name = "labels")
public class Label {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    /** 名前なしは空の文字（''）。 */
    @Column(name = "name", nullable = false, length = 20)
    private String name;

    @Convert(converter = LabelColorConverter.class)
    @Column(name = "color", nullable = false, length = 10)
    private LabelColor color;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    /** JPA が使うための、引数なしのコンストラクタ。 */
    protected Label() {
    }

    public Label(Board board, String name, LabelColor color) {
        this.board = board;
        this.name = name;
        this.color = color;
    }

    public Long getId() {
        return id;
    }

    public Board getBoard() {
        return board;
    }

    public String getName() {
        return name;
    }

    public LabelColor getColor() {
        return color;
    }
}
