package com.taskboard.service;

import static com.taskboard.entity.TaskPriority.HIGH;
import static com.taskboard.entity.TaskPriority.LOW;
import static com.taskboard.entity.TaskPriority.MEDIUM;
import static com.taskboard.entity.TaskStatus.DOING;
import static com.taskboard.entity.TaskStatus.DONE;
import static com.taskboard.entity.TaskStatus.TODO;

import com.taskboard.entity.Board;
import com.taskboard.entity.Label;
import com.taskboard.entity.LabelColor;
import com.taskboard.entity.Task;
import com.taskboard.repository.BoardRepository;
import com.taskboard.repository.LabelRepository;
import com.taskboard.repository.TaskRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 見本データ（docs/DB設計.md の「4. 見本データ」）を1か所にまとめた部品。
 * 初回の起動（seedIfEmpty）と、あとで作る毎日のリセット（F-55）の両方で、同じ中身を使う。
 * 期限は「日本時間の今日」から数えた日付で入れる（固定の日付にすると、次の日から期限切れになるため）。
 */
@Service
public class SampleDataService {

    private static final Logger log = LoggerFactory.getLogger(SampleDataService.class);

    private final BoardRepository boardRepository;
    private final LabelRepository labelRepository;
    private final TaskRepository taskRepository;
    private final Clock clock;

    public SampleDataService(BoardRepository boardRepository, LabelRepository labelRepository,
            TaskRepository taskRepository, Clock clock) {
        this.boardRepository = boardRepository;
        this.labelRepository = labelRepository;
        this.taskRepository = taskRepository;
        this.clock = clock;
    }

    /**
     * ボードのテーブルが空のときだけ、見本データを入れる。
     * ボードが1つでもあれば何もしない（タスクを全部消した人のデータを、勝手に戻さないため）。
     *
     * @return 入れたら true、入れなかったら false
     */
    @Transactional
    public boolean seedIfEmpty() {
        if (boardRepository.count() > 0) {
            log.info("データがあるので、見本データは入れません");
            return false;
        }
        insertSampleData();
        return true;
    }

    /**
     * 見本データを入れる。途中で失敗したら、全部取り消す（1つのトランザクション）。
     * このメソッドはデータを消さない。毎日のリセットでは、消したあとにこれを呼ぶ。
     * seedIfEmpty() から呼ばれたときは、このメソッドの @Transactional は効かず、
     * seedIfEmpty() のトランザクションの中で動く（同じクラスの中からの呼び出しのため）。どちらでも全体が1つにまとまる。
     */
    @Transactional
    public void insertSampleData() {
        LocalDate today = LocalDate.now(clock);

        Board work = new Board("仕事", (short) 0);
        Board home = new Board("プライベート", (short) 1);
        List<Board> boards = List.of(work, home);
        SampleSet workSet = workSamples(work, today);
        SampleSet homeSet = homeSamples(home, today);
        List<Label> labels = concat(workSet.labels(), homeSet.labels());
        List<Task> tasks = concat(workSet.tasks(), homeSet.tasks());

        // 入れる順番：ボード → ラベル → タスク（タスクとラベルの結び付けは、最後にまとめて入る）
        boardRepository.saveAll(boards);
        labelRepository.saveAll(labels);
        taskRepository.saveAll(tasks);

        log.info("見本データを入れました（ボード{}・ラベル{}・タスク{}）", boards.size(), labels.size(), tasks.size());
    }

    /** 「仕事」ボードのラベル6つとタスク5件。 */
    private SampleSet workSamples(Board work, LocalDate today) {
        Label urgent = new Label(work, "緊急", LabelColor.RED);
        Label billing = new Label(work, "請求", LabelColor.YELLOW);
        Label meeting = new Label(work, "会議", LabelColor.BLUE);
        Label document = new Label(work, "資料", LabelColor.GREEN);
        Label contact = new Label(work, "連絡", LabelColor.ORANGE);
        Label study = new Label(work, "学習", LabelColor.PURPLE);

        List<Task> tasks = List.of(
                new Task(work, TODO, 0, "経費の精算を出す", null,
                        false, HIGH, today.minusDays(1), Set.of(urgent, billing)),
                new Task(work, TODO, 1, "週次レポートを書く", null,
                        false, MEDIUM, today, Set.of(document)),
                new Task(work, DOING, 0, "会議の資料をまとめる", "議題と前回の決定事項を1枚にまとめる",
                        false, HIGH, today.plusDays(3), Set.of(meeting, document)),
                new Task(work, DOING, 1, "新しいツールの使い方を覚える", null,
                        false, LOW, null, Set.of(study)),
                new Task(work, DONE, 0, "取引先に日程の返事をする", null,
                        true, null, null, Set.of(contact)));
        return new SampleSet(List.of(urgent, billing, meeting, document, contact, study), tasks);
    }

    /** 「プライベート」ボードのラベル6つとタスク5件。 */
    private SampleSet homeSamples(Board home, LocalDate today) {
        Label important = new Label(home, "大事", LabelColor.RED);
        Label housework = new Label(home, "家事", LabelColor.YELLOW);
        Label health = new Label(home, "健康", LabelColor.BLUE);
        Label shopping = new Label(home, "買い物", LabelColor.GREEN);
        Label hobby = new Label(home, "趣味", LabelColor.ORANGE);
        Label schedule = new Label(home, "予定", LabelColor.PURPLE);

        List<Task> tasks = List.of(
                new Task(home, TODO, 0, "日用品を買う", "洗剤とティッシュ",
                        false, MEDIUM, today.plusDays(2), Set.of(shopping)),
                new Task(home, TODO, 1, "部屋の掃除をする", null,
                        false, LOW, null, Set.of(housework)),
                new Task(home, DOING, 0, "旅行の計画を立てる", null,
                        false, HIGH, today.plusDays(7), Set.of(schedule, hobby)),
                new Task(home, DOING, 1, "ジョギングを週3回続ける", null,
                        false, null, null, Set.of(health)),
                new Task(home, DONE, 0, "健康診断の予約をする", null,
                        true, null, null, Set.of(important, health)));
        return new SampleSet(List.of(important, housework, health, shopping, hobby, schedule), tasks);
    }

    private static <T> List<T> concat(List<T> first, List<T> second) {
        return Stream.concat(first.stream(), second.stream()).toList();
    }

    /** 1つのボードぶんの、ラベルとタスクの組。 */
    private record SampleSet(List<Label> labels, List<Task> tasks) {
    }
}
