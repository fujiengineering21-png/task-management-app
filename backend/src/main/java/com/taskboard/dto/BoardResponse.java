package com.taskboard.dto;

import com.taskboard.entity.Board;

/** API で返すボードの形。 */
public record BoardResponse(Long id, String name, Short position) {

    public static BoardResponse from(Board board) {
        return new BoardResponse(board.getId(), board.getName(), board.getPosition());
    }
}
