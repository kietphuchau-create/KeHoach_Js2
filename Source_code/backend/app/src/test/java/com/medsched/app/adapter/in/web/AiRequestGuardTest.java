package com.medsched.app.adapter.in.web;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AiRequestGuardTest {

    @Test
    void allowsRequestsWithinRateLimit() {
        AiRequestGuard guard = new AiRequestGuard(2, 60, 5, 2000);

        assertThat(guard.check("user", "Tin nhắn 1").allowed()).isTrue();
        assertThat(guard.check("user", "Tin nhắn 2").allowed()).isTrue();
        assertThat(guard.check("user", "Tin nhắn 3").allowed()).isFalse();
    }

    @Test
    void rejectsImmediateDuplicateMessage() {
        AiRequestGuard guard = new AiRequestGuard(10, 60, 5, 2000);

        assertThat(guard.check("user", "Xin chào").allowed()).isTrue();
        AiRequestGuard.Decision decision = guard.check("user", "Xin chào");
        assertThat(decision.allowed()).isFalse();
        assertThat(decision.reason()).contains("lặp lại");
    }

    @Test
    void expiredIdentitiesAreRemovedToPreventUnboundedGrowth() {
        AiRequestGuard guard = new AiRequestGuard(20, 1, 1, 2000, 100);
        guard.check("user-a", "xin chào");
        guard.check("user-b", "đặt lịch");

        assertThat(guard.trackedIdentityCount()).isEqualTo(2);
        guard.cleanupExpiredIdentities(java.time.Instant.now().plusSeconds(3));

        assertThat(guard.trackedIdentityCount()).isZero();
    }

    @Test
    void sameShortAnswerIsAllowedForANewClarificationQuestion() {
        AiRequestGuard guard = new AiRequestGuard(20, 60, 5, 2000);

        assertThat(guard.check("user", "Tiểu buốt", "[ASSISTANT] Bạn đau ở vị trí nào?").allowed()).isTrue();
        assertThat(guard.check("user", "Tiểu buốt", "[ASSISTANT] Bạn có triệu chứng nào đi kèm?").allowed()).isTrue();
    }

    @Test
    void sameAnswerInSameConversationContextIsStillRejected() {
        AiRequestGuard guard = new AiRequestGuard(20, 60, 5, 2000);
        String context = "[ASSISTANT] Bạn có triệu chứng nào đi kèm?";

        assertThat(guard.check("user", "Tiểu buốt", context).allowed()).isTrue();
        assertThat(guard.check("user", "Tiểu buốt", context).allowed()).isFalse();
    }
}
