package com.medsched.app.config;

import com.medsched.app.adapter.out.ai.RuleBasedAiTriageAdapter;
import com.medsched.core.port.out.AiTriagePort;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Đăng ký bản cài đặt AI.
 * <p>
 * Mặc định dùng bản quy tắc từ khóa để ứng dụng chạy được ngay khi chưa có khóa
 * API. Khi phần Spring AI hoàn thiện, chỉ cần khai báo một bean khác cài
 * {@link AiTriagePort} (ví dụ đánh dấu {@code @Component} cho lớp mới) - nhờ
 * {@link ConditionalOnMissingBean}, bean tạm ở đây tự động không được tạo nữa.
 */
@Configuration
public class AiConfig {

    @Bean
    @ConditionalOnMissingBean(AiTriagePort.class)
    public AiTriagePort ruleBasedAiTriagePort() {
        return new RuleBasedAiTriageAdapter();
    }
}
