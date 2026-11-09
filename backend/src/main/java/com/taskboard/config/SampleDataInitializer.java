package com.taskboard.config;

import com.taskboard.service.SampleDataService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/** 起動したときに1回だけ、見本データを入れる（テーブルが空のときだけ。中身は SampleDataService）。 */
@Component
public class SampleDataInitializer implements ApplicationRunner {

    private final SampleDataService sampleDataService;

    public SampleDataInitializer(SampleDataService sampleDataService) {
        this.sampleDataService = sampleDataService;
    }

    @Override
    public void run(ApplicationArguments args) {
        sampleDataService.seedIfEmpty();
    }
}
