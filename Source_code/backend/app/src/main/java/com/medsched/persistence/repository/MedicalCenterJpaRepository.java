package com.medsched.persistence.repository;

import com.medsched.persistence.entity.MedicalCenterEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MedicalCenterJpaRepository extends JpaRepository<MedicalCenterEntity, String> {

    Optional<MedicalCenterEntity> findByCode(String code);

}
