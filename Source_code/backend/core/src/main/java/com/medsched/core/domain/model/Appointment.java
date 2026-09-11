package com.medsched.core.domain.model;

import java.time.Instant;

public record Appointment(
        String id,
        String bookingCode,
        String medicalCenterId,
        String patientProfileId,
        String doctorId,
        String slotId,
        String queueNumber,
        String queueType,
        String patientSymptoms,
        String aiSummary,
        String checkinMethod,
        String status,
        boolean isDelayed,
        int delayMinutes,
        Instant checkInTime,
        Instant createdAt,
        Instant updatedAt
) {
    public static Appointment createNew(
            String id,
            String bookingCode,
            String medicalCenterId,
            String patientProfileId,
            String doctorId,
            String slotId,
            String queueNumber,
            String patientSymptoms,
            String aiSummary
    ) {
        Instant now = Instant.now();
        return new Appointment(
                id,
                bookingCode,
                medicalCenterId,
                patientProfileId,
                doctorId,
                slotId,
                queueNumber,
                "ONLINE_BOOKED",
                patientSymptoms,
                aiSummary,
                null,
                "CONFIRMED",
                false,
                0,
                null,
                now,
                now
        );
    }

    public Appointment checkIn(String method, Instant checkInTime) {
        return new Appointment(
                id,
                bookingCode,
                medicalCenterId,
                patientProfileId,
                doctorId,
                slotId,
                queueNumber,
                queueType,
                patientSymptoms,
                aiSummary,
                method,
                "CHECKED_IN",
                isDelayed,
                delayMinutes,
                checkInTime,
                createdAt,
                Instant.now()
        );
    }
}
