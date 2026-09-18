package com.medsched.persistence.repository;

import com.medsched.persistence.entity.PrescriptionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PrescriptionJpaRepository extends JpaRepository<PrescriptionEntity, String> {

    Optional<PrescriptionEntity> findByAppointmentId(String appointmentId);

}
