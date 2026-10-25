package com.medsched.persistence.repository;

import com.medsched.persistence.entity.PromotionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PromotionJpaRepository extends JpaRepository<PromotionEntity, String> {

    Optional<PromotionEntity> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    List<PromotionEntity> findAllByOrderByCreatedAtDesc();
}
