package com.medsched.app.adapter.in.scheduler;

import com.medsched.mail.EmailService;
import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.entity.MedicalCenterEntity;
import com.medsched.persistence.entity.PatientProfileEntity;
import com.medsched.persistence.entity.SpecialtyEntity;
import com.medsched.persistence.entity.TimeSlotEntity;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.Gender;
import com.medsched.persistence.enums.QueueType;
import com.medsched.persistence.enums.RelationshipType;
import com.medsched.persistence.enums.SlotStatus;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.MedicalCenterJpaRepository;
import com.medsched.persistence.repository.PatientProfileJpaRepository;
import com.medsched.persistence.repository.SpecialtyJpaRepository;
import com.medsched.persistence.repository.TimeSlotJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AppointmentReminderJobTest {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Mock
    private AppointmentJpaRepository appointmentJpaRepository;
    @Mock
    private TimeSlotJpaRepository timeSlotJpaRepository;
    @Mock
    private PatientProfileJpaRepository patientProfileJpaRepository;
    @Mock
    private UserJpaRepository userJpaRepository;
    @Mock
    private DoctorJpaRepository doctorJpaRepository;
    @Mock
    private SpecialtyJpaRepository specialtyJpaRepository;
    @Mock
    private MedicalCenterJpaRepository medicalCenterJpaRepository;
    @Mock
    private EmailService emailService;

    private AppointmentReminderJob reminderJob;

    @BeforeEach
    void setUp() {
        reminderJob = new AppointmentReminderJob(
                appointmentJpaRepository,
                timeSlotJpaRepository,
                patientProfileJpaRepository,
                userJpaRepository,
                doctorJpaRepository,
                specialtyJpaRepository,
                medicalCenterJpaRepository,
                emailService
        );
    }

    @Test
    @DisplayName("[REQ-NOTI-02] Gửi email nhắc hẹn thành công cho ca khám CONFIRMED diễn ra vào ngày mai")
    void shouldSendReminderEmail_WhenAppointmentIsConfirmed_AndScheduledForTomorrow() {
        Instant now = Instant.now();
        String apptId = "appt-001";
        String slotId = "slot-001";
        String profileId = "profile-001";
        String patientUserId = "user-patient-001";
        String doctorId = "doc-001";
        String doctorUserId = "user-doc-001";
        String specialtyId = "spec-001";
        String centerId = "center-001";

        // Khung giờ khám vào 09:00 sáng ngày mai (giờ VN)
        Instant tomorrowSlotTime = LocalDate.now(VIETNAM_ZONE).plusDays(1)
                .atTime(9, 0)
                .atZone(VIETNAM_ZONE)
                .toInstant();

        AppointmentEntity appt = new AppointmentEntity(
                apptId, "MS-123456", centerId, profileId, doctorId, slotId,
                "01", QueueType.ONLINE_BOOKED, "Đau đầu chóng mặt", AppointmentStatus.CONFIRMED,
                now, now
        );

        TimeSlotEntity slot = new TimeSlotEntity(
                slotId, "sched-1", doctorId, tomorrowSlotTime, tomorrowSlotTime.plusSeconds(1800),
                SlotStatus.BOOKED, now, now
        );

        PatientProfileEntity profile = new PatientProfileEntity(
                profileId, patientUserId, RelationshipType.SELF, "Nguyễn Văn A", "0011223344", "BHYT111",
                LocalDate.of(1995, 5, 20), Gender.MALE, "0987654321", "TP.HCM", "Không",
                now, now
        );

        UserEntity patientUser = new UserEntity(
                patientUserId, "benhnhan@gmail.com", "hash", "Nguyễn Văn A", "0987654321", true, now, now
        );

        DoctorEntity doctor = new DoctorEntity(
                doctorId, doctorUserId, specialtyId, "ThS. BS",
                BigDecimal.valueOf(300000), "101", "Bác sĩ tim mạch", null, now, now
        );

        UserEntity docUser = new UserEntity(
                doctorUserId, "doctor@test.com", "hash", "Trần Văn B", "0903333333", true, now, now
        );

        SpecialtyEntity specialty = new SpecialtyEntity(
                specialtyId, centerId, "Khoa Tim Mạch", "CARDIO", "Khoa tim mạch chuyên sâu", null, now, now
        );

        MedicalCenterEntity center = new MedicalCenterEntity(
                centerId, "MC01", "Phòng khám Đa khoa MedSched Quận 1", "123 Nguyễn Thị Minh Khai, Q.1, TP.HCM",
                "0281234567", true, now, now
        );

        when(appointmentJpaRepository.findAll()).thenReturn(List.of(appt));
        when(timeSlotJpaRepository.findById(slotId)).thenReturn(Optional.of(slot));
        when(patientProfileJpaRepository.findById(profileId)).thenReturn(Optional.of(profile));
        when(userJpaRepository.findById(patientUserId)).thenReturn(Optional.of(patientUser));
        when(doctorJpaRepository.findById(doctorId)).thenReturn(Optional.of(doctor));
        when(userJpaRepository.findById(doctorUserId)).thenReturn(Optional.of(docUser));
        when(specialtyJpaRepository.findById(specialtyId)).thenReturn(Optional.of(specialty));
        when(medicalCenterJpaRepository.findById(centerId)).thenReturn(Optional.of(center));

        // When
        int count = reminderJob.triggerReminderScan();

        // Then
        assertEquals(1, count);
        verify(emailService).sendAppointmentReminderEmail(
                eq("benhnhan@gmail.com"),
                eq("Nguyễn Văn A"),
                eq("MS-123456"),
                eq("ThS. BS Trần Văn B"),
                eq("Khoa Tim Mạch"),
                any(),
                eq("Phòng khám Đa khoa MedSched Quận 1"),
                eq("123 Nguyễn Thị Minh Khai, Q.1, TP.HCM")
        );
        verify(appointmentJpaRepository).save(appt);
    }

    @Test
    @DisplayName("[REQ-NOTI-02] Bỏ qua không gửi nếu ca khám đã được gửi email nhắc hẹn trước đó")
    void shouldSkip_WhenReminderAlreadySent() {
        Instant now = Instant.now();
        AppointmentEntity appt = new AppointmentEntity(
                "appt-002", "MS-999999", "center-1", "prof-1", "doc-1", "slot-1",
                "02", QueueType.ONLINE_BOOKED, "Đau đầu\n[REMINDER-24H-SENT]: 2026-11-04T12:00:00Z",
                AppointmentStatus.CONFIRMED, now, now
        );

        when(appointmentJpaRepository.findAll()).thenReturn(List.of(appt));

        int count = reminderJob.triggerReminderScan();

        assertEquals(0, count);
        verify(emailService, never()).sendAppointmentReminderEmail(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("[REQ-NOTI-02] Bỏ qua nếu ca khám ở trạng thái CANCELLED hoặc PENDING")
    void shouldSkip_WhenStatusIsNotConfirmed() {
        Instant now = Instant.now();
        AppointmentEntity appt = new AppointmentEntity(
                "appt-003", "MS-888888", "center-1", "prof-1", "doc-1", "slot-1",
                "03", QueueType.ONLINE_BOOKED, "Triệu chứng", AppointmentStatus.PENDING,
                now, now
        );

        when(appointmentJpaRepository.findAll()).thenReturn(List.of(appt));

        int count = reminderJob.triggerReminderScan();

        assertEquals(0, count);
        verify(emailService, never()).sendAppointmentReminderEmail(any(), any(), any(), any(), any(), any(), any(), any());
    }
}
