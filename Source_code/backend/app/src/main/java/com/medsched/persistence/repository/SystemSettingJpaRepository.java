package com.medsched.persistence.repository;

import com.medsched.persistence.entity.SystemSettingEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SystemSettingJpaRepository extends JpaRepository<SystemSettingEntity, String> {

    /** Vd: findByMedicalCenterIdAndSettingKey(centerId, "DEFAULT_SLOT_DURATION_MINUTES") thay vì hardcode. */
    Optional<SystemSettingEntity> findByMedicalCenterIdAndSettingKey(String medicalCenterId, String settingKey);

}
