package com.medsched.auth;

import com.medsched.common.AppExceptions;
import com.medsched.persistence.entity.PatientProfileEntity;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.enums.RelationshipType;
import com.medsched.persistence.repository.PatientProfileJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import com.medsched.security.AppUserDetails;
import com.medsched.security.AppUserDetailsService;
import com.medsched.security.JwtService;
import com.medsched.mail.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class RegistrationOtpServiceTest {

    private static final String SECRET = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";

    private UserJpaRepository users;
    private PatientProfileJpaRepository patientProfiles;
    private AppUserDetailsService userDetailsService;
    private JwtService jwtService;
    private EmailService emailService;
    private RegistrationOtpService registrationOtpService;

    @BeforeEach
    void setUp() {
        users = mock(UserJpaRepository.class);
        patientProfiles = mock(PatientProfileJpaRepository.class);
        userDetailsService = mock(AppUserDetailsService.class);
        jwtService = new JwtService(SECRET, Duration.ofHours(1), Duration.ofDays(7));
        emailService = mock(EmailService.class);
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

        registrationOtpService = new RegistrationOtpService(users, patientProfiles, passwordEncoder, userDetailsService, jwtService, emailService);
    }

    @Test
    @DisplayName("RequestOtp generates 4-digit code and creates active session")
    void requestOtpSuccess() {
        when(users.existsByEmail("test@gmail.com")).thenReturn(false);

        RegistrationOtpDtos.RequestOtpResponse res = registrationOtpService.requestOtp(new RegistrationOtpDtos.RequestOtpRequest(
                "Trần Văn An", "test@gmail.com", "0912345678", "MatKhau@Secure99"
        ));

        assertThat(res.sessionToken()).isNotBlank();
        assertThat(res.phoneMasked()).isEqualTo("0912***678");
        assertThat(res.expiresInSeconds()).isEqualTo(120);
        assertThat(res.devDemoOtp()).matches("^[0-9]{4}$");
    }

    @Test
    @DisplayName("RequestOtp rejects duplicate email")
    void requestOtpDuplicateEmail() {
        when(users.existsByEmail("da_co@gmail.com")).thenReturn(true);

        assertThatThrownBy(() -> registrationOtpService.requestOtp(new RegistrationOtpDtos.RequestOtpRequest(
                "Trần Văn An", "da_co@gmail.com", "0912345678", "MatKhau@Secure99"
        ))).isInstanceOf(AppExceptions.ConflictException.class);
    }

    @Test
    @DisplayName("RequestOtp rejects password containing user's name")
    void requestOtpRejectsPasswordWithPersonalName() {
        when(users.existsByEmail("nam@gmail.com")).thenReturn(false);

        assertThatThrownBy(() -> registrationOtpService.requestOtp(new RegistrationOtpDtos.RequestOtpRequest(
                "Nguyễn Văn Nam", "nam@gmail.com", "0912345678", "NguyenVanNam@123"
        ))).isInstanceOf(AppExceptions.BadRequestException.class);
    }

    @Test
    @DisplayName("VerifyOtp succeeds with correct 4-digit OTP, creates User & Profile, issues JWT")
    void verifyOtpSuccess() {
        when(users.existsByEmail("an@gmail.com")).thenReturn(false);
        when(users.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userDetailsService.loadUserById(anyString())).thenAnswer(inv -> {
            String uid = inv.getArgument(0);
            UserEntity u = new UserEntity(uid, "an@gmail.com", "$2a$10$hash", "Trần Văn An", "0912345678", true, java.time.Instant.now(), java.time.Instant.now());
            return new AppUserDetails(u, List.of());
        });

        // Step 1: Request
        RegistrationOtpDtos.RequestOtpResponse reqRes = registrationOtpService.requestOtp(new RegistrationOtpDtos.RequestOtpRequest(
                "Trần Văn An", "an@gmail.com", "0912345678", "MatKhau@Secure99"
        ));

        String code = reqRes.devDemoOtp();

        // Step 2: Verify with correct code
        AuthDtos.AuthResponse authRes = registrationOtpService.verifyOtp(new RegistrationOtpDtos.VerifyOtpRequest(
                reqRes.sessionToken(), code
        ));

        assertThat(authRes.accessToken()).isNotBlank();
        assertThat(authRes.fullName()).isEqualTo("Trần Văn An");
        assertThat(authRes.roles()).containsExactly("ROLE_PATIENT");

        ArgumentCaptor<PatientProfileEntity> profileCaptor = ArgumentCaptor.forClass(PatientProfileEntity.class);
        verify(patientProfiles).save(profileCaptor.capture());
        assertThat(profileCaptor.getValue().getRelationship()).isEqualTo(RelationshipType.SELF);
        assertThat(profileCaptor.getValue().getFullName()).isEqualTo("Trần Văn An");
    }

    @Test
    @DisplayName("VerifyOtp fails on wrong code and decrements attempts")
    void verifyOtpWrongCode() {
        when(users.existsByEmail("an@gmail.com")).thenReturn(false);

        RegistrationOtpDtos.RequestOtpResponse reqRes = registrationOtpService.requestOtp(new RegistrationOtpDtos.RequestOtpRequest(
                "Trần Văn An", "an@gmail.com", "0912345678", "MatKhau@Secure99"
        ));

        assertThatThrownBy(() -> registrationOtpService.verifyOtp(new RegistrationOtpDtos.VerifyOtpRequest(
                reqRes.sessionToken(), "0000"
        ))).isInstanceOf(AppExceptions.BadRequestException.class)
          .hasMessageContaining("2 lần thử");
    }

    @Test
    @DisplayName("ResendOtp enforces cooldown period")
    void resendOtpCooldown() {
        when(users.existsByEmail("an@gmail.com")).thenReturn(false);

        RegistrationOtpDtos.RequestOtpResponse reqRes = registrationOtpService.requestOtp(new RegistrationOtpDtos.RequestOtpRequest(
                "Trần Văn An", "an@gmail.com", "0912345678", "MatKhau@Secure99"
        ));

        // Immediately resend should fail due to 60s cooldown
        assertThatThrownBy(() -> registrationOtpService.resendOtp(new RegistrationOtpDtos.ResendOtpRequest(
                reqRes.sessionToken()
        ))).isInstanceOf(AppExceptions.BadRequestException.class)
          .hasMessageContaining("giây");
    }
}
