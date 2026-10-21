package com.medsched.app.adapter.in.web;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AiRequestGuardTest {

    @Test
    void bucket4jRejectsRequestsOverConfiguredCapacity() {
        AiRequestGuard guard = new AiRequestGuard(2, 60, 1, 2000, 100);

        assertThat(guard.check("user", "câu một").allowed()).isTrue();
        assertThat(guard.check("user", "câu hai").allowed()).isTrue();
        AiRequestGuard.Decision rejected = guard.check("user", "câu ba");

        assertThat(rejected.allowed()).isFalse();
        assertThat(rejected.retryAfterSeconds()).isPositive();
    }

    @Test
    void duplicateMessageIsRejectedBeforeItCanSpamTheAi() {
        AiRequestGuard guard = new AiRequestGuard(20, 60, 5, 2000, 100);

        assertThat(guard.check("user", "xin chào").allowed()).isTrue();
        assertThat(guard.check("user", "Xin chào").allowed()).isFalse();
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
}
