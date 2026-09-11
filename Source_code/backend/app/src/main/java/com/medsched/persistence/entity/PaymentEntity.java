package com.medsched.persistence.entity;

import com.medsched.persistence.enums.PaymentMethod;
import com.medsched.persistence.enums.PaymentStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Một lần thu tiền của ca khám. Thay cho 2 cột {@code payment_status} /
 * {@code payment_amount} cũ nằm trong appointments.
 * <p>
 * 1 ca khám có thể có NHIỀU dòng: đặt cọc online rồi thu thêm tại quầy, hoặc
 * lần trả thất bại rồi trả lại. Tổng tiền đã thu và tình trạng thanh toán được
 * suy ra từ bảng này (xem {@code PaymentJpaRepository#sumSucceededNetAmount}),
 * nên không có cột trạng thái trùng lặp ở appointments để tránh lệch dữ liệu.
 * <p>
 * {@code transactionRef} là UNIQUE ở tầng DB: đây là chốt chặn webhook của cổng
 * thanh toán gọi lặp làm ghi nhận hoặc hoàn tiền hai lần (kịch bản 7.8 trong
 * 03_Luong_Chinh/Luong_Nghiep_Vu_Chinh.md).
 */
@Entity
@Table(name = "payments")
public class PaymentEntity {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @Column(name = "appointment_id", nullable = false, length = 36)
    private String appointmentId;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PaymentMethod method;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus status;

    /** Mã giao dịch của cổng thanh toán; NULL với tiền mặt tại quầy. */
    @Column(name = "transaction_ref", unique = true, length = 100)
    private String transactionRef;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "refunded_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal refundedAmount;

    @Column(name = "refunded_at")
    private Instant refundedAt;

    @Column(name = "refund_ref", length = 100)
    private String refundRef;

    /** Lễ tân thu tiền tại quầy; NULL khi tiền vào qua cổng thanh toán online. */
    @Column(name = "collected_by", length = 36)
    private String collectedBy;

    @Column(length = 500)
    private String note;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "created_by", length = 36)
    private String createdBy;

    @Column(name = "updated_by", length = 36)
    private String updatedBy;

    protected PaymentEntity() {
    }

    public PaymentEntity(String id, String appointmentId, BigDecimal amount, PaymentMethod method,
                         PaymentStatus status, String transactionRef, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.appointmentId = appointmentId;
        this.amount = amount;
        this.method = method;
        this.status = status;
        this.transactionRef = transactionRef;
        this.refundedAmount = BigDecimal.ZERO;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() {
        return id;
    }

    public String getAppointmentId() {
        return appointmentId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public PaymentMethod getMethod() {
        return method;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public void setStatus(PaymentStatus status) {
        this.status = status;
    }

    public String getTransactionRef() {
        return transactionRef;
    }

    public Instant getPaidAt() {
        return paidAt;
    }

    public void setPaidAt(Instant paidAt) {
        this.paidAt = paidAt;
    }

    public BigDecimal getRefundedAmount() {
        return refundedAmount;
    }

    public void setRefundedAmount(BigDecimal refundedAmount) {
        this.refundedAmount = refundedAmount;
    }

    public Instant getRefundedAt() {
        return refundedAt;
    }

    public void setRefundedAt(Instant refundedAt) {
        this.refundedAt = refundedAt;
    }

    public String getRefundRef() {
        return refundRef;
    }

    public void setRefundRef(String refundRef) {
        this.refundRef = refundRef;
    }

    public String getCollectedBy() {
        return collectedBy;
    }

    public void setCollectedBy(String collectedBy) {
        this.collectedBy = collectedBy;
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

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public String getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }

}
