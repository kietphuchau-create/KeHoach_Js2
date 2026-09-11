package com.medsched.persistence.repository;

import com.medsched.persistence.entity.DoctorEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DoctorJpaRepository extends JpaRepository<DoctorEntity, String> {

    List<DoctorEntity> findByUserId(String userId);

    Optional<DoctorEntity> findByUserIdAndSpecialtyId(String userId, String specialtyId);

    List<DoctorEntity> findBySpecialtyId(String specialtyId);

}
