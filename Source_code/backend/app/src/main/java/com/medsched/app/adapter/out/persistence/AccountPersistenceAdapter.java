package com.medsched.app.adapter.out.persistence;

import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.core.domain.model.AccountUser;
import com.medsched.core.port.out.AccountRepositoryPort;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.repository.UserJpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

/**
 * Outbound Persistence Adapter cho Account:
 * Chuyển giao tiếp giữa Outbound Port trong Core và Spring Data JPA Entity (UserEntity / UserJpaRepository).
 */
@Component
public class AccountPersistenceAdapter implements AccountRepositoryPort {

    private final UserJpaRepository users;

    public AccountPersistenceAdapter(UserJpaRepository users) {
        this.users = users;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AccountUser> findById(String userId) {
        return users.findById(userId).map(this::toDomain);
    }

    @Override
    @Transactional
    public AccountUser saveProfile(String userId, String fullName, String phone) {
        UserEntity user = users.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản"));
        user.setFullName(fullName);
        user.setPhone(phone);
        user.setUpdatedAt(Instant.now());
        user.setUpdatedBy(userId);
        return toDomain(users.save(user));
    }

    @Override
    @Transactional
    public void savePasswordHash(String userId, String newPasswordHash) {
        UserEntity user = users.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản"));
        user.setPasswordHash(newPasswordHash);
        user.setUpdatedAt(Instant.now());
        user.setUpdatedBy(userId);
        users.save(user);
    }

    private AccountUser toDomain(UserEntity entity) {
        return new AccountUser(
                entity.getId(),
                entity.getEmail(),
                entity.getFullName(),
                entity.getPhone(),
                entity.getPasswordHash(),
                entity.isActive()
        );
    }

}
