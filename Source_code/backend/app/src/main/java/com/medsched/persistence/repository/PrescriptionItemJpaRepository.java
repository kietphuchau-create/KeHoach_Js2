package com.medsched.persistence.repository;

import com.medsched.persistence.entity.PrescriptionItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PrescriptionItemJpaRepository extends JpaRepository<PrescriptionItemEntity, String> {

    List<PrescriptionItemEntity> findByMedicalRecordId(String medicalRecordId);

    /**
     * Thống kê thuốc được kê nhiều nhất tại 1 chi nhánh - loại truy vấn KHÔNG
     * thể viết được khi đơn thuốc còn là 1 cột TEXT tự do, và là lý do chính để
     * tách bảng theo góp ý phản biện.
     */
    @Query("""
            SELECT i.medicineName, COUNT(i), SUM(i.quantity)
            FROM PrescriptionItemEntity i, MedicalRecordEntity r, AppointmentEntity a
            WHERE i.medicalRecordId = r.id AND r.appointmentId = a.id
              AND a.medicalCenterId = :medicalCenterId
            GROUP BY i.medicineName
            ORDER BY COUNT(i) DESC
            """)
    List<Object[]> countMostPrescribedByCenter(@Param("medicalCenterId") String medicalCenterId);

}
