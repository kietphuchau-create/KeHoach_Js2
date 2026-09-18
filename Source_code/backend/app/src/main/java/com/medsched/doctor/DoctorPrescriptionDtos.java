package com.medsched.doctor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class DoctorPrescriptionDtos {

    public record PrescriptionItemRequest(
            @NotBlank(message = "Tên thuốc không được để trống")
            String medicineName,
            String dosage,
            BigDecimal quantity,
            String unit,
            BigDecimal unitPrice
    ) {}

    public record CreatePrescriptionRequest(
            @NotBlank(message = "Chẩn đoán bệnh không được để trống")
            String diagnosis,
            String doctorAdvice,
            List<PrescriptionItemRequest> items
    ) {}

    public record PrescriptionResponse(
            String prescriptionId,
            String appointmentId,
            String doctorName,
            BigDecimal totalMedicineAmount,
            String status,
            Instant createdAt
    ) {}
}
