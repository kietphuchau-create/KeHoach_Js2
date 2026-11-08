package com.medsched.persistence.repository;

import com.medsched.persistence.entity.DoctorEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface DoctorJpaRepository extends JpaRepository<DoctorEntity, String>, JpaSpecificationExecutor<DoctorEntity> {

    List<DoctorEntity> findByUserId(String userId);

    Optional<DoctorEntity> findByUserIdAndSpecialtyId(String userId, String specialtyId);

    List<DoctorEntity> findBySpecialtyId(String specialtyId);

}

