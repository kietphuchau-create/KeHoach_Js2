package com.medsched.persistence.repository;

import com.medsched.persistence.entity.ServiceEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ServiceJpaRepository extends JpaRepository<ServiceEntity, String> {

    List<ServiceEntity> findBySpecialtyIdAndActiveTrue(String specialtyId);

    Optional<ServiceEntity> findBySpecialtyIdAndCode(String specialtyId, String code);

    Page<ServiceEntity> findBySpecialtyId(String specialtyId, Pageable pageable);

    /** Lọc dịch vụ theo chi nhánh (đi qua specialties vì services gắn vào chuyên khoa). */
    @Query("""
            SELECT s FROM ServiceEntity s, SpecialtyEntity sp
            WHERE s.specialtyId = sp.id AND sp.medicalCenterId = :medicalCenterId
            """)
    Page<ServiceEntity> findByMedicalCenterId(@Param("medicalCenterId") String medicalCenterId, Pageable pageable);

}
