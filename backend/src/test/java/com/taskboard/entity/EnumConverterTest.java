package com.taskboard.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Locale;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** enum と、データベースの小文字の値をつなぐ変換部品のテスト。 */
class EnumConverterTest {

    private final TaskStatusConverter statusConverter = new TaskStatusConverter();
    private final TaskPriorityConverter priorityConverter = new TaskPriorityConverter();
    private final LabelColorConverter colorConverter = new LabelColorConverter();

    @Test
    @DisplayName("すべての値が、小文字の値と行き来できる")
    void everyValueRoundTrips() {
        for (TaskStatus status : TaskStatus.values()) {
            String value = statusConverter.convertToDatabaseColumn(status);
            assertThat(value).isEqualTo(status.name().toLowerCase(Locale.ROOT));
            assertThat(statusConverter.convertToEntityAttribute(value)).isEqualTo(status);
        }
        for (TaskPriority priority : TaskPriority.values()) {
            String value = priorityConverter.convertToDatabaseColumn(priority);
            assertThat(value).isEqualTo(priority.name().toLowerCase(Locale.ROOT));
            assertThat(priorityConverter.convertToEntityAttribute(value)).isEqualTo(priority);
        }
        for (LabelColor color : LabelColor.values()) {
            String value = colorConverter.convertToDatabaseColumn(color);
            assertThat(value).isEqualTo(color.name().toLowerCase(Locale.ROOT));
            assertThat(colorConverter.convertToEntityAttribute(value)).isEqualTo(color);
        }
    }

    @Test
    @DisplayName("null は null のまま（優先度なしを表すため）")
    void nullStaysNull() {
        assertThat(priorityConverter.convertToDatabaseColumn(null)).isNull();
        assertThat(priorityConverter.convertToEntityAttribute(null)).isNull();
        assertThat(statusConverter.convertToEntityAttribute(null)).isNull();
        assertThat(colorConverter.convertToEntityAttribute(null)).isNull();
    }

    @Test
    @DisplayName("知らない値は、例外にして気づけるようにする")
    void unknownValueThrows() {
        assertThatThrownBy(() -> statusConverter.convertToEntityAttribute("TODO"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> priorityConverter.convertToEntityAttribute("urgent"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> colorConverter.convertToEntityAttribute("pink"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
