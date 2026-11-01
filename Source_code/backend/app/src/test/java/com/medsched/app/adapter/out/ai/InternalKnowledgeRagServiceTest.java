package com.medsched.app.adapter.out.ai;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class InternalKnowledgeRagServiceTest {

    @Test
    void retrievesReviewedClinicKnowledgeWithoutExternalAi() {
        var service = new InternalKnowledgeRagService();

        var answer = service.retrieve("Tôi cần đặt lịch khám và đến trước bao lâu?");

        assertThat(answer).isPresent();
        assertThat(answer.orElseThrow().source()).isEqualTo("Đặt lịch và giờ làm việc");
        assertThat(answer.orElseThrow().text()).contains("15 phút");
    }

    @Test
    void doesNotInventAnAnswerForUnrelatedLowRelevanceText() {
        var service = new InternalKnowledgeRagService();

        assertThat(service.retrieve("phương trình lượng tử thiên văn")).isEmpty();
    }
}
