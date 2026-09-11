package com.medsched.persistence.repository;

import com.medsched.persistence.entity.AppointmentStatusLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AppointmentStatusLogJpaRepository extends JpaRepository<AppointmentStatusLogEntity, String> {

    List<AppointmentStatusLogEntity> findByAppointmentIdOrderByCreatedAtAsc(String appointmentId);

}
