package com.medsched.core.usecase;

import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.core.domain.model.AccountUser;
import com.medsched.core.port.in.ChangePasswordUseCase;
import com.medsched.core.port.out.AccountRepositoryPort;
import com.medsched.core.port.out.PasswordEncoderPort;

/**
 * Nghiệp vụ Đổi mật khẩu tài khoản trong Core Hexagon.
 * Thuần Java logic: kiểm tra mật khẩu cũ, kiểm tra trùng lặp, mã hóa và lưu trữ.
 */
public class ChangePasswordService implements ChangePasswordUseCase {

    private final AccountRepositoryPort accountRepository;
    private final PasswordEncoderPort passwordEncoder;

    public ChangePasswordService(AccountRepositoryPort accountRepository,
                                 PasswordEncoderPort passwordEncoder) {
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void changePassword(Command command) {
        AccountUser user = accountRepository.findById(command.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản"));

        if (!passwordEncoder.matches(command.currentPassword(), user.passwordHash())) {
            throw new IllegalArgumentException("Mật khẩu hiện tại không đúng");
        }

        if (passwordEncoder.matches(command.newPassword(), user.passwordHash())) {
            throw new IllegalArgumentException("Mật khẩu mới phải khác mật khẩu hiện tại");
        }

        String newHash = passwordEncoder.encode(command.newPassword());
        accountRepository.savePasswordHash(command.userId(), newHash);
    }

}
