package com.medsched.statistics;

import com.medsched.persistence.entity.*;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.PaymentMethod;
import com.medsched.persistence.enums.PaymentStatus;
import com.medsched.persistence.enums.QueueType;
import com.medsched.persistence.enums.UserRole;
import com.medsched.persistence.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class StatisticsServiceTest {

    @Mock
    private AppointmentJpaRepository appointmentRepo;
    @Mock
    private InvoiceJpaRepository invoiceRepo;
    @Mock
    private PaymentJpaRepository paymentRepo;
    @Mock
    private PrescriptionJpaRepository prescriptionRepo;
    @Mock
    private DoctorJpaRepository doctorRepo;
    @Mock
    private UserJpaRepository userRepo;
    @Mock
    private SpecialtyJpaRepository specialtyRepo;
    @Mock
    private PatientProfileJpaRepository patientProfileRepo;
    @Mock
    private UserMedicalCenterRoleJpaRepository roleRepo;

    private StatisticsService statisticsService;

    @BeforeEach
    void setUp() {
        statisticsService = new StatisticsService(
                appointmentRepo, invoiceRepo, paymentRepo, prescriptionRepo,
                doctorRepo, userRepo, specialtyRepo, patientProfileRepo, roleRepo
        );
    }

    @Test
    @DisplayName("Thống kê Admin: Tính toán lượt khám, doanh thu và danh sách bác sĩ")
    void givenAdminRole_whenGetOverview_thenReturnAdminStats() {
        Instant now = Instant.now();
        AppointmentEntity appt1 = new AppointmentEntity(
                "app-1", "MED-111", "c-1", "p-1", "doc-1", "slot-1",
                "01", QueueType.ONLINE_BOOKED, "Trieu chung", AppointmentStatus.COMPLETED,
                now, now
        );
        appt1.setCheckInTime(now);

        PaymentEntity pay = new PaymentEntity(
                "pay-1", "app-1", BigDecimal.valueOf(300000), PaymentMethod.VNPAY,
                PaymentStatus.SUCCEEDED, "VN123", now, now
        );

        DoctorEntity doc = new DoctorEntity(
                "doc-1", "u-doc-1", "spec-1", "ThS.BS",
                BigDecimal.valueOf(300000), "P.101", "Bac si kinh nghiem", null, now, now
        );

        UserEntity userDoc = new UserEntity(
                "u-doc-1", "doc@test.com", "hash", "Nguyen Van A", "0901234567", true, now, now
        );

        SpecialtyEntity spec = new SpecialtyEntity(
                "spec-1", "c-1", "Noi Khoa", "INTERNAL", "Khoa noi", null, now, now
        );

        UserMedicalCenterRoleEntity adminRole = new UserMedicalCenterRoleEntity(
                "r-1", "admin-1", "c-1", UserRole.ROLE_ADMIN, now, now
        );

        given(roleRepo.findByUserIdAndActiveTrue("admin-1")).willReturn(List.of(adminRole));
        given(appointmentRepo.findAll()).willReturn(List.of(appt1));
        given(paymentRepo.findByStatus(PaymentStatus.SUCCEEDED)).willReturn(List.of(pay));
        given(doctorRepo.findAll()).willReturn(List.of(doc));
        given(userRepo.findById("u-doc-1")).willReturn(Optional.of(userDoc));
        given(specialtyRepo.findById("spec-1")).willReturn(Optional.of(spec));
        given(appointmentRepo.countByDoctorIdAndStatus("doc-1", AppointmentStatus.COMPLETED)).willReturn(1L);

        var res = statisticsService.getOverview("ROLE_ADMIN", "DAY", "TODAY", "visits", "admin-1", null);

        assertThat(res).isNotNull();
        assertThat(res.roleScope()).isEqualTo("ROLE_ADMIN");
        assertThat(res.kpiCards()).isNotEmpty();
        assertThat(res.breakdownItems()).isNotEmpty();
        assertThat(res.donutSegments()).hasSize(2);
    }

    @Test
    @DisplayName("Thống kê Bác Sĩ: Lọc theo bác sĩ đăng nhập và trả về KPI cá nhân")
    void givenDoctorRole_whenGetOverview_thenReturnDoctorStats() {
        Instant now = Instant.now();
        DoctorEntity doc = new DoctorEntity(
                "doc-1", "u-doc-1", "spec-1", "BS.CKI",
                BigDecimal.valueOf(250000), "P.205", "Bio", null, now, now
        );

        AppointmentEntity appt = new AppointmentEntity(
                "app-doc-1", "MED-DOC1", "c-1", "p-1", "doc-1", "slot-1",
                "02", QueueType.ONLINE_BOOKED, "Trieu chung", AppointmentStatus.COMPLETED,
                now, now
        );

        UserEntity userDoc = new UserEntity(
                "u-doc-1", "doc2@test.com", "hash", "Tran B", "0902222222", true, now, now
        );

        SpecialtyEntity spec = new SpecialtyEntity(
                "spec-1", "c-1", "Da Lieu", "DERM", "Khoa da lieu", null, now, now
        );

        given(roleRepo.findByUserIdAndActiveTrue("u-doc-1")).willReturn(List.of());
        given(doctorRepo.findByUserId("u-doc-1")).willReturn(List.of(doc));
        given(doctorRepo.findAll()).willReturn(List.of(doc));
        given(userRepo.findById("u-doc-1")).willReturn(Optional.of(userDoc));
        given(specialtyRepo.findById("spec-1")).willReturn(Optional.of(spec));
        given(appointmentRepo.findByDoctorId("doc-1")).willReturn(List.of(appt));
        given(prescriptionRepo.countByDoctorId("doc-1")).willReturn(1L);

        var res = statisticsService.getOverview("ROLE_DOCTOR", "HOURLY", "LAST_7_DAYS", "doctor_visits", "u-doc-1", null);

        assertThat(res).isNotNull();
        assertThat(res.roleScope()).isEqualTo("ROLE_DOCTOR");
        assertThat(res.kpiCards()).isNotEmpty();
        assertThat(res.timeSeries()).isNotEmpty();
    }

    @Test
    @DisplayName("Thống kê Lễ Tân: Tính toán lượt check-in và cơ cấu tiền mặt/chuyển khoản")
    void givenStaffRole_whenGetOverview_thenReturnStaffStats() {
        Instant now = Instant.now();
        AppointmentEntity appt = new AppointmentEntity(
                "app-staff-1", "MED-STF", "c-1", "p-1", "doc-1", "slot-1",
                "03", QueueType.WALKIN, "Trieu chung", AppointmentStatus.CHECKED_IN,
                now, now
        );
        appt.setCheckInTime(now);

        PaymentEntity payCash = new PaymentEntity(
                "pay-cash", "app-staff-1", BigDecimal.valueOf(150000), PaymentMethod.CASH,
                PaymentStatus.SUCCEEDED, null, now, now
        );

        given(roleRepo.findByUserIdAndActiveTrue("staff-1")).willReturn(List.of());
        given(doctorRepo.findAll()).willReturn(List.of());
        given(appointmentRepo.findAll()).willReturn(List.of(appt));
        given(paymentRepo.findByStatus(PaymentStatus.SUCCEEDED)).willReturn(List.of(payCash));

        var res = statisticsService.getOverview("ROLE_STAFF", "DAY", "THIS_MONTH", "checkins", "staff-1", null);

        assertThat(res).isNotNull();
        assertThat(res.roleScope()).isEqualTo("ROLE_STAFF");
        assertThat(res.kpiCards()).isNotEmpty();
        assertThat(res.donutSegments()).isNotEmpty();
    }
}
