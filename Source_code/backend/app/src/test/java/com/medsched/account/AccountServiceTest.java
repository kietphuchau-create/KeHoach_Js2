package com.medsched.account;

import com.medsched.core.domain.model.AccountUser;
import com.medsched.core.port.in.ChangePasswordUseCase;
import com.medsched.core.port.in.UpdateProfileUseCase;
import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.entity.PatientProfileEntity;
import com.medsched.persistence.entity.SpecialtyEntity;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.enums.Gender;
import com.medsched.persistence.enums.RelationshipType;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.MedicalCenterJpaRepository;
import com.medsched.persistence.repository.PatientProfileJpaRepository;
import com.medsched.persistence.repository.SpecialtyJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import com.medsched.security.AppUserDetails;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    @Mock
    private UserJpaRepository users;
    @Mock
    private PatientProfileJpaRepository patientProfiles;
    @Mock
    private DoctorJpaRepository doctors;
    @Mock
    private SpecialtyJpaRepository specialties;
    @Mock
    private MedicalCenterJpaRepository medicalCenters;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private UpdateProfileUseCase updateProfileUseCase;
    @Mock
    private ChangePasswordUseCase changePasswordUseCase;

    private AccountService accountService;

    @BeforeEach
    void setUp() {
        accountService = new AccountService(
                users, patientProfiles, doctors, specialties, medicalCenters,
                passwordEncoder, updateProfileUseCase, changePasswordUseCase
        );
    }

    @Test
    @DisplayName("Lấy thông tin tài khoản cá nhân MeResponse thành công")
    void givenUser_whenMe_thenReturnProfile() {
        Instant now = Instant.now();
        UserEntity user = new UserEntity(
                "u-1", "user@test.com", "pass", "Nguyen Me", "0900000000", true, now, now
        );

        AppUserDetails principal = new AppUserDetails(user, List.of());

        DoctorEntity doc = new DoctorEntity(
                "doc-1", "u-1", "spec-1", "BS", BigDecimal.valueOf(300000), "P.101", "Bio", null, now, now
        );

        SpecialtyEntity spec = new SpecialtyEntity(
                "spec-1", "c-1", "Chuyen Khoa 1", "CK1", "Mo ta", null, now, now
        );

        PatientProfileEntity pat = new PatientProfileEntity(
                "p-1", "u-1", RelationshipType.SELF, "Nguyen Me", "0011223344", "BHYT1",
                LocalDate.of(1990, 1, 1), Gender.MALE, "0900000000", "HN", "None",
                now, now
        );

        given(users.findById("u-1")).willReturn(Optional.of(user));
        given(doctors.findByUserId("u-1")).willReturn(List.of(doc));
        given(specialties.findById("spec-1")).willReturn(Optional.of(spec));
        given(patientProfiles.findByUserIdAndRelationship("u-1", RelationshipType.SELF)).willReturn(Optional.of(pat));

        var res = accountService.me(principal);

        assertThat(res).isNotNull();
        assertThat(res.userId()).isEqualTo("u-1");
        assertThat(res.email()).isEqualTo("user@test.com");
        assertThat(res.fullName()).isEqualTo("Nguyen Me");
    }

    @Test
    @DisplayName("Cập nhật thông tin tài khoản và đổi mật khẩu")
    void givenCommands_whenUpdateProfileAndChangePassword_thenSuccess() {
        Instant now = Instant.now();
        UserEntity user = new UserEntity(
                "u-1", "user@test.com", "pass", "Updated Name", "0901234567", true, now, now
        );
        AppUserDetails principal = new AppUserDetails(user, List.of());

        given(updateProfileUseCase.updateProfile(any())).willReturn(new AccountUser("u-1", "user@test.com", "Updated Name", "0901234567", "pass", true));
        given(users.findById("u-1")).willReturn(Optional.of(user));

        var updateReq = new AccountDtos.UpdateProfileRequest("Updated Name", "0901234567");
        var meRes = accountService.updateProfile(principal, updateReq);
        assertThat(meRes.fullName()).isEqualTo("Updated Name");

        var pwdReq = new AccountDtos.ChangePasswordRequest("old123", "new123");
        assertThatCode(() -> accountService.changePassword(principal, pwdReq)).doesNotThrowAnyException();
        verify(changePasswordUseCase).changePassword(any());
    }

    @Test
    @DisplayName("Cập nhật hồ sơ bệnh nhân cá nhân")
    void givenPatientProfile_whenUpdatePatientProfile_thenSuccess() {
        Instant now = Instant.now();
        UserEntity user = new UserEntity(
                "u-1", "user@test.com", "pass", "Nguyen Me", "0900000000", true, now, now
        );
        AppUserDetails principal = new AppUserDetails(user, List.of());

        PatientProfileEntity pat = new PatientProfileEntity(
                "pat-1", "u-1", RelationshipType.SELF, "Old Name", "0011223344", "BHYT1",
                LocalDate.of(1990, 1, 1), Gender.MALE, "0900000000", "HN", "None",
                now, now
        );

        given(patientProfiles.findByUserIdAndRelationship("u-1", RelationshipType.SELF)).willReturn(Optional.of(pat));
        given(patientProfiles.save(any())).willAnswer(inv -> inv.getArgument(0));

        var req = new AccountDtos.UpdatePatientProfileRequest("Nguyen Patient", "123456789", "BHYT123", LocalDate.of(1990, 1, 1), Gender.MALE, "0909090909", "Ha Noi", "Khong");
        var res = accountService.updatePatientProfile(principal, req);

        assertThat(res).isNotNull();
        assertThat(res.fullName()).isEqualTo("Nguyen Patient");
        assertThat(res.cccdNumber()).isEqualTo("123456789");
    }
}
