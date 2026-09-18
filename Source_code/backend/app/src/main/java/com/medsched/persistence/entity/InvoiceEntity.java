package com.medsched.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * CLAB-108: Hóa đơn viện phí (Tiền khám bác sĩ + Tiền thuốc).
 */
@Entity
@Table(name = "invoices")
public class InvoiceEntity {

    @Id
    @Column(nullable = false, length = 64)
    private String id;

    @Column(name = "invoice_number", nullable = false, unique = true, length = 32)
    private String invoiceNumber;

    @Column(name = "appointment_id", nullable = false, length = 36)
    private String appointmentId;

    @Column(name = "patient_profile_id", length = 36)
    private String patientProfileId;

    @Column(name = "doctor_id", length = 36)
    private String doctorId;

    @Column(name = "consultation_fee", nullable = false, precision = 19, scale = 2)
    private BigDecimal consultationFee;

    @Column(name = "medicine_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal medicineAmount;

    @Column(name = "total_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "amount_paid", nullable = false, precision = 19, scale = 2)
    private BigDecimal amountPaid;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(name = "payment_method", length = 30)
    private String paymentMethod;

    @Column(length = 500)
    private String note;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    protected InvoiceEntity() {
    }

    public InvoiceEntity(String id, String invoiceNumber, String appointmentId, String patientProfileId,
                         String doctorId, BigDecimal consultationFee, BigDecimal medicineAmount,
                         BigDecimal totalAmount, BigDecimal amountPaid, String status,
                         Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.invoiceNumber = invoiceNumber;
        this.appointmentId = appointmentId;
        this.patientProfileId = patientProfileId;
        this.doctorId = doctorId;
        this.consultationFee = consultationFee;
        this.medicineAmount = medicineAmount;
        this.totalAmount = totalAmount;
        this.amountPaid = amountPaid;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() {
        return id;
    }

    public String getInvoiceNumber() {
        return invoiceNumber;
    }

    public String getAppointmentId() {
        return appointmentId;
    }

    public String getPatientProfileId() {
        return patientProfileId;
    }

    public String getDoctorId() {
        return doctorId;
    }

    public BigDecimal getConsultationFee() {
        return consultationFee;
    }

    public void setConsultationFee(BigDecimal consultationFee) {
        this.consultationFee = consultationFee;
    }

    public BigDecimal getMedicineAmount() {
        return medicineAmount;
    }

    public void setMedicineAmount(BigDecimal medicineAmount) {
        this.medicineAmount = medicineAmount;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public BigDecimal getAmountPaid() {
        return amountPaid;
    }

    public void setAmountPaid(BigDecimal amountPaid) {
        this.amountPaid = amountPaid;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Instant getPaidAt() {
        return paidAt;
    }

    public void setPaidAt(Instant paidAt) {
        this.paidAt = paidAt;
    }
}
