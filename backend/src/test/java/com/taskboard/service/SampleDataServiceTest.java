package com.taskboard.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.taskboard.entity.Board;
import com.taskboard.entity.Label;
import com.taskboard.entity.LabelColor;
import com.taskboard.entity.Task;
import com.taskboard.repository.BoardRepository;
import com.taskboard.repository.LabelRepository;
import com.taskboard.repository.TaskRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SampleDataServiceTest {

    /** 日本時間では 2026-11-07 00:30。UTC の日付（11/6）とずれる時刻にして、日本時間で数えているかを確かめる。 */
    private static final Clock FIXED_CLOCK =
            Clock.fixed(Instant.parse("2026-11-06T15:30:00Z"), ZoneId.of("Asia/Tokyo"));
    private static final LocalDate TODAY_IN_JAPAN = LocalDate.of(2026, 11, 7);

    @Mock
    private BoardRepository boardRepository;

    @Mock
    private LabelRepository labelRepository;

    @Mock
    private TaskRepository taskRepository;

    @Captor
    private ArgumentCaptor<Iterable<Board>> boardsCaptor;

    @Captor
    private ArgumentCaptor<Iterable<Label>> labelsCaptor;

    @Captor
    private ArgumentCaptor<Iterable<Task>> tasksCaptor;

    private SampleDataService sampleDataService;

    @BeforeEach
    void setUp() {
        sampleDataService =
                new SampleDataService(boardRepository, labelRepository, taskRepository, FIXED_CLOCK);
    }

    @Test
    @DisplayName("ボードのテーブルが空なら、ボード2・ラベル12・タスク10を入れる")
    void seedIfEmptyInsertsAllWhenNoBoards() {
        when(boardRepository.count()).thenReturn(0L);

        boolean inserted = sampleDataService.seedIfEmpty();

        assertThat(inserted).isTrue();
        assertThat(savedBoards())
                .extracting(Board::getName, Board::getPosition)
                .containsExactly(tuple("仕事", (short) 0), tuple("プライベート", (short) 1));
        assertThat(savedLabels()).hasSize(12);
        assertThat(savedTasks()).hasSize(10);
    }

    @Test
    @DisplayName("ラベルは、ボードごとに6色を1つずつ持つ")
    void eachBoardHasOneLabelOfEachColor() {
        when(boardRepository.count()).thenReturn(0L);

        sampleDataService.seedIfEmpty();

        List<Label> labels = savedLabels();
        for (Board board : savedBoards()) {
            List<LabelColor> colors = labels.stream()
                    .filter(label -> label.getBoard() == board)
                    .map(Label::getColor)
                    .toList();
            assertThat(colors).containsExactlyInAnyOrderElementsOf(EnumSet.allOf(LabelColor.class));
        }
    }

    @Test
    @DisplayName("タスクは各ボードに5件ずつで、付けるラベルは同じボードのものだけ")
    void tasksUseLabelsOfTheSameBoard() {
        when(boardRepository.count()).thenReturn(0L);

        sampleDataService.seedIfEmpty();

        List<Task> tasks = savedTasks();
        for (Board board : savedBoards()) {
            assertThat(tasks).filteredOn(task -> task.getBoard() == board).hasSize(5);
        }
        for (Task task : tasks) {
            assertThat(task.getLabels()).allSatisfy(label -> assertThat(label.getBoard()).isSameAs(task.getBoard()));
        }
    }

    @Test
    @DisplayName("期限は、日本時間の今日から数えた日付で入れる")
    void dueDatesAreRelativeToTodayInJapan() {
        when(boardRepository.count()).thenReturn(0L);

        sampleDataService.seedIfEmpty();

        assertThat(savedTasks())
                .filteredOn(task -> task.getDueDate() != null)
                .extracting(Task::getTitle, Task::getDueDate)
                .contains(
                        tuple("経費の精算を出す", TODAY_IN_JAPAN.minusDays(1)),
                        tuple("週次レポートを書く", TODAY_IN_JAPAN),
                        tuple("会議の資料をまとめる", TODAY_IN_JAPAN.plusDays(3)),
                        tuple("日用品を買う", TODAY_IN_JAPAN.plusDays(2)),
                        tuple("旅行の計画を立てる", TODAY_IN_JAPAN.plusDays(7)));
    }

    @Test
    @DisplayName("ボードが1つでもあれば、何も入れない")
    void seedIfEmptyDoesNothingWhenBoardsExist() {
        when(boardRepository.count()).thenReturn(2L);

        boolean inserted = sampleDataService.seedIfEmpty();

        assertThat(inserted).isFalse();
        verify(boardRepository, never()).saveAll(any());
        verifyNoInteractions(labelRepository, taskRepository);
    }

    private List<Board> savedBoards() {
        verify(boardRepository).saveAll(boardsCaptor.capture());
        return toList(boardsCaptor.getValue());
    }

    private List<Label> savedLabels() {
        verify(labelRepository).saveAll(labelsCaptor.capture());
        return toList(labelsCaptor.getValue());
    }

    private List<Task> savedTasks() {
        verify(taskRepository).saveAll(tasksCaptor.capture());
        return toList(tasksCaptor.getValue());
    }

    private static <T> List<T> toList(Iterable<T> items) {
        List<T> list = new ArrayList<>();
        items.forEach(list::add);
        return list;
    }
}
