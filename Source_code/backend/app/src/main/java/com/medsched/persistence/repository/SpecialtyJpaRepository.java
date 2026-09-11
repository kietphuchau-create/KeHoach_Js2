package com.medsched.persistence.repository;

import com.medsched.persistence.entity.SpecialtyEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SpecialtyJpaRepository extends JpaRepository<SpecialtyEntity, String> {

    List<SpecialtyEntity> findByMedicalCenterId(String medicalCenterId);

    /** Kiem tra trung ma chuyen khoa trong cung 1 co so (UNIQUE(medical_center_id, code)). */
    Optional<SpecialtyEntity> findByMedicalCenterIdAndCode(String medicalCenterId, String code);

}
