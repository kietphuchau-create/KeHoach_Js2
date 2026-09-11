package com.medsched.persistence.repository;

import com.medsched.persistence.entity.MedicalRecordEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MedicalRecordJpaRepository extends JpaRepository<MedicalRecordEntity, String> {

    Optional<MedicalRecordEntity> findByAppointmentId(String appointmentId);

}
