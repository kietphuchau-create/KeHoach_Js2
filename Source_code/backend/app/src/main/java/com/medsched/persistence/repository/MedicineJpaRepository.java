package com.medsched.persistence.repository;

import com.medsched.persistence.entity.MedicineEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MedicineJpaRepository extends JpaRepository<MedicineEntity, String> {

    List<MedicineEntity> findByMedicalCenterIdAndActiveTrue(String medicalCenterId);

    Optional<MedicineEntity> findByMedicalCenterIdAndCode(String medicalCenterId, String code);

    List<MedicineEntity> findByMedicalCenterIdAndNameContainingIgnoreCase(String medicalCenterId, String keyword);

}
