package com.medsched.persistence.repository;

import com.medsched.persistence.entity.DoctorReviewEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DoctorReviewJpaRepository extends JpaRepository<DoctorReviewEntity, String> {

    List<DoctorReviewEntity> findByDoctorIdOrderByCreatedAtDesc(String doctorId);

    List<DoctorReviewEntity> findByAppointmentId(String appointmentId);

    void deleteByAppointmentId(String appointmentId);

    @Query("SELECT AVG(r.rating) FROM DoctorReviewEntity r WHERE r.doctorId = :doctorId")
    Double getAverageRatingByDoctorId(@Param("doctorId") String doctorId);

    long countByDoctorId(String doctorId);

}

