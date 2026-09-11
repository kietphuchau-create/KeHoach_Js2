package com.medsched.persistence.repository;

import com.medsched.persistence.entity.DoctorReviewEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DoctorReviewJpaRepository extends JpaRepository<DoctorReviewEntity, String> {

    List<DoctorReviewEntity> findByDoctorIdOrderByCreatedAtDesc(String doctorId);

}
