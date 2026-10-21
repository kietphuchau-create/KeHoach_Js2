package com.medsched.reception;

import com.medsched.persistence.entity.*;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.CheckinMethod;
import com.medsched.persistence.enums.Gender;
import com.medsched.persistence.enums.QueueType;
import com.medsched.persistence.enums.RelationshipType;
import com.medsched.persistence.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class ReceptionHistoryServiceTest {

    @Mock
    private AppointmentJpaRepository appointmentJpaRepository;
    @Mock
    private PatientProfileJpaRepository patientProfileJpaRepository;
    @Mock
    private DoctorJpaRepository doctorJpaRepository;
    @Mock
    private SpecialtyJpaRepository specialtyJpaRepository;
    @Mock
    private UserJpaRepository userJpaRepository;

    private ReceptionHistoryService receptionHistoryService;

    @BeforeEach
    void setUp() {
        receptionHistoryService = new ReceptionHistoryService(
                appointmentJpaRepository, patientProfileJpaRepository,
                doctorJpaRepository, specialtyJpaRepository, userJpaRepository
        );
    }

    @Test
    @DisplayName("Lấy lịch sử tiếp đón thành công với đầy đủ KPI tóm tắt và danh sách đã lọc")
    void givenAppointments_whenGetReceptionHistory_thenReturnHistoryAndSummary() {
        Instant now = Instant.now();
        AppointmentEntity appt = new AppointmentEntity(
                "app-1", "MED-123456", "c-1", "p-1", "doc-1", "slot-1",
                "01", QueueType.ONLINE_BOOKED, "Trieu chung", AppointmentStatus.CHECKED_IN,
                now, now
        );
        appt.setCheckinMethod(CheckinMethod.QR_CODE);
        appt.setCheckInTime(now);

        PatientProfileEntity patient = new PatientProfileEntity(
                "p-1", "u-pat-1", RelationshipType.SELF, "Nguyen Van B", "0011223344", "BHYT111",
                LocalDate.of(1995, 5, 20), Gender.MALE, "0987654321", "Ha Noi", "Khong",
                now, now
        );

        DoctorEntity doc = new DoctorEntity(
                "doc-1", "u-doc-1", "spec-1", "BS.CKI",
                BigDecimal.valueOf(300000), "101", "Bio", null, now, now
        );

        SpecialtyEntity spec = new SpecialtyEntity(
                "spec-1", "c-1", "Nhi Khoa", "PEDIATRIC", "Khoa nhi", null, now, now
        );

        UserEntity userDoc = new UserEntity(
                "u-doc-1", "doc@test.com", "hash", "Le Van C", "0903333333", true, now, now
        );

        given(appointmentJpaRepository.findAll()).willReturn(List.of(appt));
        given(patientProfileJpaRepository.findById("p-1")).willReturn(Optional.of(patient));
        given(doctorJpaRepository.findById("doc-1")).willReturn(Optional.of(doc));
        given(specialtyJpaRepository.findById("spec-1")).willReturn(Optional.of(spec));
        given(userJpaRepository.findById("u-doc-1")).willReturn(Optional.of(userDoc));

        var response = receptionHistoryService.getReceptionHistory(null, "QR_CODE", "ALL", null, null);

        assertThat(response).isNotNull();
        assertThat(response.summary()).isNotNull();
        assertThat(response.summary().totalCheckins()).isEqualTo(1);
        assertThat(response.summary().qrCheckins()).isEqualTo(1);
        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).patientName()).isEqualTo("Nguyen Van B");
        assertThat(response.items().get(0).doctorName()).contains("Le Van C");
    }

    @Test
    @DisplayName("Tìm kiếm lịch sử tiếp đón theo từ khóa tên hoặc số điện thoại")
    void givenKeyword_whenGetReceptionHistory_thenReturnMatchingItems() {
        Instant now = Instant.now();
        AppointmentEntity appt = new AppointmentEntity(
                "app-2", "MED-654321", "c-1", "p-2", "doc-1", "slot-1",
                "02", QueueType.WALKIN, "Trieu chung", AppointmentStatus.COMPLETED,
                now, now
        );
        appt.setCheckinMethod(CheckinMethod.MANUAL);
        appt.setCheckInTime(now);

        PatientProfileEntity patient = new PatientProfileEntity(
                "p-2", "u-pat-2", RelationshipType.SELF, "Tran Thi Mai", "0011223355", "BHYT222",
                LocalDate.of(1992, 2, 2), Gender.FEMALE, "0912345678", "Da Nang", "Khong",
                now, now
        );

        given(appointmentJpaRepository.findAll()).willReturn(List.of(appt));
        given(patientProfileJpaRepository.findById("p-2")).willReturn(Optional.of(patient));

        var match = receptionHistoryService.getReceptionHistory("Mai", "ALL", "ALL", null, null);
        assertThat(match.items()).hasSize(1);

        var noMatch = receptionHistoryService.getReceptionHistory("KhongCo", "ALL", "ALL", null, null);
        assertThat(noMatch.items()).isEmpty();
    }
}
