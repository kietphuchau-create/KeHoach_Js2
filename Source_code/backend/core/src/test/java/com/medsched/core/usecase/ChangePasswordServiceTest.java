package com.medsched.core.usecase;

import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.core.domain.model.AccountUser;
import com.medsched.core.port.in.ChangePasswordUseCase;
import com.medsched.core.port.out.AccountRepositoryPort;
import com.medsched.core.port.out.PasswordEncoderPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ChangePasswordServiceTest {

    @Mock
    private AccountRepositoryPort accountRepository;

    @Mock
    private PasswordEncoderPort passwordEncoder;

    private ChangePasswordService changePasswordService;

    @BeforeEach
    void setUp() {
        changePasswordService = new ChangePasswordService(accountRepository, passwordEncoder);
    }

    @Test
    @DisplayName("Đổi mật khẩu thành công khi mật khẩu cũ khớp và mật khẩu mới hợp lệ")
    void givenValidCommand_whenChangePassword_thenSuccess() {
        AccountUser user = new AccountUser("u-1", "user@test.com", "User Test", "0901234567", "hash-old", true);
        given(accountRepository.findById("u-1")).willReturn(Optional.of(user));
        given(passwordEncoder.matches("oldPass123", "hash-old")).willReturn(true);
        given(passwordEncoder.matches("newPass123", "hash-old")).willReturn(false);
        given(passwordEncoder.encode("newPass123")).willReturn("hash-new");

        ChangePasswordUseCase.Command cmd = new ChangePasswordUseCase.Command("u-1", "oldPass123", "newPass123");

        assertThatCode(() -> changePasswordService.changePassword(cmd)).doesNotThrowAnyException();
        verify(accountRepository).savePasswordHash("u-1", "hash-new");
    }

    @Test
    @DisplayName("Ném lỗi ResourceNotFoundException khi không tìm thấy tài khoản")
    void givenNotFoundUser_whenChangePassword_thenThrowException() {
        given(accountRepository.findById("u-unknown")).willReturn(Optional.empty());

        ChangePasswordUseCase.Command cmd = new ChangePasswordUseCase.Command("u-unknown", "oldPass", "newPass");

        assertThatThrownBy(() -> changePasswordService.changePassword(cmd))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Không tìm thấy tài khoản");
    }

    @Test
    @DisplayName("Ném lỗi khi mật khẩu hiện tại không đúng")
    void givenWrongCurrentPassword_whenChangePassword_thenThrowException() {
        AccountUser user = new AccountUser("u-1", "user@test.com", "User Test", "0901234567", "hash-old", true);
        given(accountRepository.findById("u-1")).willReturn(Optional.of(user));
        given(passwordEncoder.matches("wrongPass", "hash-old")).willReturn(false);

        ChangePasswordUseCase.Command cmd = new ChangePasswordUseCase.Command("u-1", "wrongPass", "newPass");

        assertThatThrownBy(() -> changePasswordService.changePassword(cmd))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Mật khẩu hiện tại không đúng");
    }

    @Test
    @DisplayName("Ném lỗi khi mật khẩu mới trùng mật khẩu hiện tại")
    void givenSameNewPassword_whenChangePassword_thenThrowException() {
        AccountUser user = new AccountUser("u-1", "user@test.com", "User Test", "0901234567", "hash-old", true);
        given(accountRepository.findById("u-1")).willReturn(Optional.of(user));
        given(passwordEncoder.matches("oldPass", "hash-old")).willReturn(true);
        given(passwordEncoder.matches("oldPass", "hash-old")).willReturn(true);

        ChangePasswordUseCase.Command cmd = new ChangePasswordUseCase.Command("u-1", "oldPass", "oldPass");

        assertThatThrownBy(() -> changePasswordService.changePassword(cmd))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Mật khẩu mới phải khác mật khẩu hiện tại");
    }
}
