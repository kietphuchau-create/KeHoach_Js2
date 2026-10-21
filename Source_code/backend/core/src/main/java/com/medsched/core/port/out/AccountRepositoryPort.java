package com.medsched.core.port.out;

import com.medsched.core.domain.model.AccountUser;
import java.util.Optional;

/**
 * Outbound Port: Giao tiếp với tầng lưu trữ (Persistence) để truy vấn và cập nhật AccountUser.
 */
public interface AccountRepositoryPort {

    Optional<AccountUser> findById(String userId);

    AccountUser saveProfile(String userId, String fullName, String phone);

    void savePasswordHash(String userId, String newPasswordHash);

}
