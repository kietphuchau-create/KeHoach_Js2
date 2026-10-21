package com.medsched.core.usecase;

import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.core.domain.model.AccountUser;
import com.medsched.core.port.in.UpdateProfileUseCase;
import com.medsched.core.port.out.AccountRepositoryPort;

/**
 * Nghiệp vụ Cập nhật thông tin tài khoản cá nhân trong Core Hexagon.
 */
public class UpdateProfileService implements UpdateProfileUseCase {

    private final AccountRepositoryPort accountRepository;

    public UpdateProfileService(AccountRepositoryPort accountRepository) {
        this.accountRepository = accountRepository;
    }

    @Override
    public AccountUser updateProfile(Command command) {
        accountRepository.findById(command.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản"));

        String cleanName = command.fullName() != null ? command.fullName().trim() : null;
        String cleanPhone = command.phone() != null && !command.phone().isBlank() ? command.phone().trim() : null;

        return accountRepository.saveProfile(command.userId(), cleanName, cleanPhone);
    }

}
