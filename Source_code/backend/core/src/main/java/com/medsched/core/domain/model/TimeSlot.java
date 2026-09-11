package com.medsched.core.domain.model;

import java.time.Instant;

public record TimeSlot(
        String id,
        String doctorScheduleId,
        Instant startTime,
        Instant endTime,
        String status,
        int version
) {
    public boolean isAvailable() {
        return "AVAILABLE".equalsIgnoreCase(status);
    }
}
