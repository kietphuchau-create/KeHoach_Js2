package com.medsched.billing;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class BillingDtos {

    public record BillItemDto(
            String medicineName,
            BigDecimal quantity,
            String unit,
            BigDecimal unitPrice,
            BigDecimal amount
    ) {}

    public record BillDetailResponse(
            String appointmentId,
            String bookingCode,
            String patientName,
            String doctorName,
            BigDecimal consultationFee,
            BigDecimal medicineAmount,
            BigDecimal totalAmount,
            String status,
            String invoiceId,
            List<BillItemDto> items
    ) {}

    public record PayInvoiceRequest(
            String paymentMethod,
            @NotNull(message = "Số tiền thanh toán không được null")
            @Positive(message = "Số tiền thanh toán phải lớn hơn 0")
            BigDecimal amountPaid,
            String note
    ) {}

    public record PayInvoiceResponse(
            String invoiceId,
            String appointmentId,
            String status,
            BigDecimal amountPaid,
            String paymentMethod,
            String transactionRef,
            Instant paidAt,
            String message
    ) {}
}
