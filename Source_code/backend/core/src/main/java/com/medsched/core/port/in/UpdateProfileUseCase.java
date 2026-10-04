package com.medsched.core.port.in;

import com.medsched.core.domain.model.AccountUser;

/**
 * Inbound Port: Định nghĩa UseCase Cập nhật thông tin cơ bản của tài khoản.
 */
public interface UpdateProfileUseCase {

    record Command(
            String userId,
            String fullName,
            String phone
    ) {}

    AccountUser updateProfile(Command command);

}
