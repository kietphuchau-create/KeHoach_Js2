package com.medsched.persistence.repository;

import com.medsched.persistence.entity.PaymentEntity;
import com.medsched.persistence.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface PaymentJpaRepository extends JpaRepository<PaymentEntity, String> {

    List<PaymentEntity> findByAppointmentId(String appointmentId);

    /**
     * Tra theo mã giao dịch của cổng thanh toán. Dùng trước khi ghi nhận webhook
     * để bảo đảm tính idempotent - cổng thanh toán có thể gọi lại cùng 1 giao
     * dịch nhiều lần (kịch bản 7.8).
     */
    Optional<PaymentEntity> findByTransactionRef(String transactionRef);

    List<PaymentEntity> findByStatus(PaymentStatus status);

    /**
     * Số tiền thực nhận của 1 ca khám = tổng các lần thu thành công trừ phần đã
     * hoàn. Đây là cách suy ra tình trạng thanh toán thay cho cột
     * {@code appointments.payment_status} đã bỏ, nhờ vậy không bao giờ lệch giữa
     * cột trạng thái và lịch sử giao dịch thật.
     */
    @Query("""
            SELECT COALESCE(SUM(p.amount - p.refundedAmount), 0)
            FROM PaymentEntity p
            WHERE p.appointmentId = :appointmentId AND p.status = com.medsched.persistence.enums.PaymentStatus.SUCCEEDED
            """)
    BigDecimal sumSucceededNetAmount(@Param("appointmentId") String appointmentId);

}
