package com.taskboard.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * アプリで使う時計。「今日」は日本時間で決める（見本データの期限など）。
 * テストでは、時刻を固定した時計に差し替えられる。
 */
@Configuration
public class ClockConfig {

    public static final ZoneId APP_ZONE = ZoneId.of("Asia/Tokyo");

    @Bean
    public Clock clock() {
        return Clock.system(APP_ZONE);
    }
}
