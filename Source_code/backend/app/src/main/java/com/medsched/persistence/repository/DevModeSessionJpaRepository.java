package com.medsched.persistence.repository;

import com.medsched.persistence.entity.DevModeSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DevModeSessionJpaRepository extends JpaRepository<DevModeSessionEntity, String> {

    Optional<DevModeSessionEntity> findFirstByIsActiveTrueOrderByStartedAtDesc();

    List<DevModeSessionEntity> findByIsActiveTrue();

    List<DevModeSessionEntity> findAllByOrderByStartedAtDesc();
}
