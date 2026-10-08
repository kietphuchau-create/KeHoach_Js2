package com.medsched.reception;

import java.time.Instant;
import java.util.List;

public class ReceptionDtos {

    public record ReceptionHistoryItemDto(
            String appointmentId,
            String bookingCode,
            String queueNumber,
            String queueType,
            String checkinMethod,
            String patientName,
            String gender,
            int birthYear,
            String phone,
            String cccdNumber,
            String doctorName,
            String specialtyName,
            String roomNumber,
            String symptoms,
            String status,
            Instant checkInTime,
            String formattedCheckInTime,
            Instant createdAt,
            String formattedCreatedAt
    ) {}

    public record ReceptionHistorySummaryDto(
            long totalCheckins,
            long qrCheckins,
            long cccdCheckins,
            long manualWalkinCheckins,
            long completedCount,
            long waitingCount
    ) {}

    public record ReceptionHistoryResponse(
            ReceptionHistorySummaryDto summary,
            List<ReceptionHistoryItemDto> items
    ) {}
}
