package com.medsched.app.config;

import com.medsched.app.adapter.out.ai.RuleBasedAiTriageAdapter;
import com.medsched.core.port.out.AiTriagePort;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Đăng ký bản cài đặt AI.
 * <p>
 * Mặc định luôn dùng bản quy tắc nội bộ, không phụ thuộc khóa API ngoài.
 * Adapter ngoài chỉ được bật khi cấu hình rõ {@code app.ai.external-enabled=true}.
 */
@Configuration
public class AiConfig {

    @Bean
    @ConditionalOnMissingBean(AiTriagePort.class)
    public AiTriagePort ruleBasedAiTriagePort() {
        return new RuleBasedAiTriageAdapter();
    }
}
