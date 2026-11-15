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

    @Mock
    private com.medsched.persistence.repository.PatientProfileJpaRepository patientProfiles;

    @Mock
    private com.medsched.persistence.repository.AppointmentJpaRepository appointments;

    @Mock
    private com.medsched.persistence.repository.AppointmentStatusLogJpaRepository appointmentStatusLogs;

    @Mock
    private com.medsched.persistence.repository.PaymentJpaRepository payments;

    @Mock
    private com.medsched.persistence.repository.InvoiceJpaRepository invoices;

    @Mock
    private com.medsched.persistence.repository.MedicalRecordJpaRepository medicalRecords;

    @Mock
    private com.medsched.persistence.repository.PrescriptionJpaRepository prescriptions;

    @Mock
    private com.medsched.persistence.repository.PrescriptionItemJpaRepository prescriptionItems;

    @Mock
    private com.medsched.persistence.repository.DoctorReviewJpaRepository doctorReviews;

    @Mock
    private com.medsched.persistence.repository.DoctorScheduleJpaRepository doctorSchedules;

    @Mock
    private com.medsched.persistence.repository.TimeSlotJpaRepository timeSlots;

    @Mock
    private com.medsched.persistence.repository.PasswordResetTokenJpaRepository passwordResetTokens;

    @Mock
    private com.medsched.persistence.repository.RevokedTokenJpaRepository revokedTokens;

    @InjectMocks
    private AdminUserService adminUserService;

    @Test
    void printHash() {
        var enc = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
        System.out.println("NEW_HASH_IS: " + enc.encode("Medsched@123"));
        System.out.println("OLD_HASH_MATCHES: " + enc.matches("Medsched@123", "$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti"));
    }

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
                "P.101",
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

    @Test
    @DisplayName("Xóa tài khoản test thất bại khi Chế độ 24/7 đang TẮT")
    void testDeleteDevUser_DevModeInactive_ThrowsException() {
        com.medsched.doctor.DoctorScheduleService.setDevMode247Active(false);

        var ex = assertThrows(AppExceptions.BadRequestException.class, () -> {
            adminUserService.deleteDevUser("user-001", "admin-001");
        });
        assertThat(ex.getMessage()).contains("Chỉ được phép xóa tài khoản khi đang BẬT Chế Độ Develop 24/7");
    }

    @Test
    @DisplayName("Xóa tài khoản test thất bại khi tài khoản tạo TRƯỚC thời điểm bật 24/7")
    void testDeleteDevUser_CreatedBeforeDevMode_ThrowsException() {
        try {
            com.medsched.doctor.DoctorScheduleService.setDevMode247Active(true);
            Instant oldTime = Instant.now().minusSeconds(3600); // Tạo trước 1 tiếng
            UserEntity preExistingUser = new UserEntity(
                    "old-user-001", "old@test.vn", "hash", "Old User", "0911111111", true, oldTime, oldTime
            );

            when(users.findById("old-user-001")).thenReturn(Optional.of(preExistingUser));

            var ex = assertThrows(AppExceptions.BadRequestException.class, () -> {
                adminUserService.deleteDevUser("old-user-001", "admin-001");
            });
            assertThat(ex.getMessage()).contains("Chỉ được phép xóa các tài khoản test tạo sau thời điểm bật Chế độ 24/7");
        } finally {
            com.medsched.doctor.DoctorScheduleService.setDevMode247Active(false);
        }
    }

    @Test
    @DisplayName("Xóa tài khoản test thất bại khi Admin cố tình tự xóa chính mình")
    void testDeleteDevUser_SelfDelete_ThrowsException() {
        try {
            com.medsched.doctor.DoctorScheduleService.setDevMode247Active(true);
            Instant futureTime = Instant.now().plusSeconds(60);
            UserEntity adminUser = new UserEntity(
                    "admin-001", "admin@medsched.vn", "hash", "Admin", "0900000001", true, futureTime, futureTime
            );

            when(users.findById("admin-001")).thenReturn(Optional.of(adminUser));

            var ex = assertThrows(AppExceptions.BadRequestException.class, () -> {
                adminUserService.deleteDevUser("admin-001", "admin-001");
            });
            assertThat(ex.getMessage()).contains("Không thể tự xóa tài khoản của chính mình");
        } finally {
            com.medsched.doctor.DoctorScheduleService.setDevMode247Active(false);
        }
    }

    @Test
    @DisplayName("Xóa tài khoản test thành công khi tạo SAU thời điểm bật 24/7")
    void testDeleteDevUser_Success() {
        try {
            com.medsched.doctor.DoctorScheduleService.setDevMode247Active(true);
            Instant testCreatedTime = Instant.now().plusSeconds(10); // Tạo trong phiên 24/7
            UserEntity testUser = new UserEntity(
                    "test-user-999", "test999@gmail.com", "hash", "Test Patient", "0988888888", true, testCreatedTime, testCreatedTime
            );

            when(users.findById("test-user-999")).thenReturn(Optional.of(testUser));
            when(roles.findByUserId("test-user-999")).thenReturn(List.of());
            when(doctors.findByUserId("test-user-999")).thenReturn(List.of());
            when(patientProfiles.findByUserId("test-user-999")).thenReturn(List.of());

            adminUserService.deleteDevUser("test-user-999", "admin-001");

            verify(users, times(1)).delete(testUser);
            verify(users, times(1)).flush();
        } finally {
            com.medsched.doctor.DoctorScheduleService.setDevMode247Active(false);
        }
    }
}
