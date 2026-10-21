package com.medsched.core.usecase;

import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.core.domain.model.AccountUser;
import com.medsched.core.port.in.UpdateProfileUseCase;
import com.medsched.core.port.out.AccountRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class UpdateProfileServiceTest {

    @Mock
    private AccountRepositoryPort accountRepository;

    private UpdateProfileService updateProfileService;

    @BeforeEach
    void setUp() {
        updateProfileService = new UpdateProfileService(accountRepository);
    }

    @Test
    @DisplayName("Cập nhật thông tin tài khoản thành công")
    void givenValidCommand_whenUpdateProfile_thenSuccess() {
        AccountUser user = new AccountUser("u-1", "user@test.com", "Old Name", "0900000000", "hash", true);
        AccountUser updated = new AccountUser("u-1", "user@test.com", "New Name", "0901234567", "hash", true);

        given(accountRepository.findById("u-1")).willReturn(Optional.of(user));
        given(accountRepository.saveProfile("u-1", "New Name", "0901234567")).willReturn(updated);

        UpdateProfileUseCase.Command cmd = new UpdateProfileUseCase.Command("u-1", "  New Name  ", "  0901234567  ");
        AccountUser result = updateProfileService.updateProfile(cmd);

        assertThat(result).isNotNull();
        assertThat(result.fullName()).isEqualTo("New Name");
        assertThat(result.phone()).isEqualTo("0901234567");
        verify(accountRepository).saveProfile("u-1", "New Name", "0901234567");
    }

    @Test
    @DisplayName("Ném lỗi ResourceNotFoundException khi không tìm thấy tài khoản để cập nhật")
    void givenNonExistentUser_whenUpdateProfile_thenThrowException() {
        given(accountRepository.findById("u-missing")).willReturn(Optional.empty());

        UpdateProfileUseCase.Command cmd = new UpdateProfileUseCase.Command("u-missing", "Name", "0900000000");

        assertThatThrownBy(() -> updateProfileService.updateProfile(cmd))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Không tìm thấy tài khoản");
    }
}
