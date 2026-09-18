package com.medsched.admin;

import com.medsched.common.AppExceptions;
import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.entity.MedicalCenterEntity;
import com.medsched.persistence.entity.SpecialtyEntity;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.entity.UserMedicalCenterRoleEntity;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.MedicalCenterJpaRepository;
import com.medsched.persistence.repository.SpecialtyJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import com.medsched.persistence.repository.UserMedicalCenterRoleJpaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock
    private UserJpaRepository users;

    @Mock
    private UserMedicalCenterRoleJpaRepository roles;

    @Mock
    private DoctorJpaRepository doctors;

    @Mock
    private SpecialtyJpaRepository specialties;

    @Mock
    private MedicalCenterJpaRepository medicalCenters;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AdminUserService adminUserService;

    @Test
    @DisplayName("Admin tạo nhân viên lễ tân thành công")
    void testCreateStaff_Success() {
        String centerId = "center-001";
        Instant now = Instant.now();
        MedicalCenterEntity center = new MedicalCenterEntity(
                centerId, "MC01", "Bệnh viện Đa Khoa MedSched", "123 Q1", "0900000000", true, now, now
        );

        when(medicalCenters.findById(centerId)).thenReturn(Optional.of(center));
        when(users.existsByEmail("letan.test@medsched.vn")).thenReturn(false);
        when(passwordEncoder.encode("Medsched@123")).thenReturn("hashed-pwd");
        when(users.save(any(UserEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(roles.findByUserIdAndActiveTrue(any())).thenReturn(List.of());

        AdminDtos.CreateStaffRequest req = new AdminDtos.CreateStaffRequest(
                "letan.test@medsched.vn",
                "Medsched@123",
                "Nguyễn Văn Lễ Tân",
                "0987654321",
                centerId
        );

        AdminDtos.UserSummary res = adminUserService.createStaff(req, "admin-id");

        assertThat(res).isNotNull();
        assertThat(res.email()).isEqualTo("letan.test@medsched.vn");
        verify(roles).save(any(UserMedicalCenterRoleEntity.class));
    }

    @Test
    @DisplayName("Admin tạo bác sĩ thành công khi không có phòng khám cố định")
    void testCreateDoctor_SuccessWithoutRoomNumber() {
        String specialtyId = "spec-001";
        Instant now = Instant.now();
        SpecialtyEntity spec = new SpecialtyEntity(
                specialtyId, "center-001", "Chuyên khoa Da liễu", "DERM", "Mô tả", null, now, now
        );

        when(specialties.findById(specialtyId)).thenReturn(Optional.of(spec));
        when(users.existsByEmail("dr.test@medsched.vn")).thenReturn(false);
        when(passwordEncoder.encode("Medsched@123")).thenReturn("hashed-pwd");
        when(users.save(any(UserEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(roles.findByUserIdAndActiveTrue(any())).thenReturn(List.of());

        AdminDtos.CreateDoctorRequest req = new AdminDtos.CreateDoctorRequest(
                "dr.test@medsched.vn",
                "Medsched@123",
                "BS.CKII Trần Văn Test",
                "0911223344",
                specialtyId,
                "BS.CKII",
                new BigDecimal("300000"),
                null
        );

        AdminDtos.UserSummary res = adminUserService.createDoctor(req, "admin-id");

        assertThat(res).isNotNull();
        assertThat(res.email()).isEqualTo("dr.test@medsched.vn");
        verify(doctors).save(any(DoctorEntity.class));
        verify(roles).save(any(UserMedicalCenterRoleEntity.class));
    }

    @Test
    @DisplayName("Admin không thể tự khóa tài khoản của chính mình")
    void testUpdateStatus_CannotDeactivateSelf() {
        String adminId = "admin-id-001";
        Instant now = Instant.now();
        UserEntity adminUser = new UserEntity(
                adminId, "admin@medsched.vn", "hash", "Admin", "0900000001", true, now, now
        );

        when(users.findById(adminId)).thenReturn(Optional.of(adminUser));

        assertThrows(AppExceptions.BadRequestException.class, () -> {
            adminUserService.updateStatus(adminId, false, adminId);
        });
    }

    @Test
    @DisplayName("Admin khóa/mở khóa tài khoản người dùng khác thành công")
    void testUpdateStatus_Success() {
        String targetUserId = "user-002";
        Instant now = Instant.now();
        UserEntity targetUser = new UserEntity(
                targetUserId, "user@test.vn", "hash", "User", "0900000002", true, now, now
        );

        when(users.findById(targetUserId)).thenReturn(Optional.of(targetUser));
        when(roles.findByUserIdAndActiveTrue(targetUserId)).thenReturn(List.of());

        AdminDtos.UserSummary summary = adminUserService.updateStatus(targetUserId, false, "admin-id-001");

        assertThat(summary).isNotNull();
        assertThat(targetUser.isActive()).isFalse();
    }
}
