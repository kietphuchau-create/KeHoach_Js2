package com.medsched.persistence.repository;

import com.medsched.persistence.entity.RevokedTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface RevokedTokenJpaRepository extends JpaRepository<RevokedTokenEntity, String> {

    boolean existsByTokenHash(String tokenHash);

    void deleteByExpiresAtBefore(Instant now);

}
