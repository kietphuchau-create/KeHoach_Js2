package com.medsched.persistence.repository;

import com.medsched.persistence.entity.SpecialtyEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpecialtyJpaRepository extends JpaRepository<SpecialtyEntity, String> {

    List<SpecialtyEntity> findByMedicalCenterId(String medicalCenterId);

}
