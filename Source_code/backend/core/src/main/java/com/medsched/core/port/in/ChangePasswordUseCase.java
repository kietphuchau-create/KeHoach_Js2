package com.medsched.core.port.in;

/**
 * Inbound Port: Định nghĩa UseCase Đổi mật khẩu tài khoản cá nhân.
 */
public interface ChangePasswordUseCase {

    record Command(
            String userId,
            String currentPassword,
            String newPassword
    ) {}

    void changePassword(Command command);

}
