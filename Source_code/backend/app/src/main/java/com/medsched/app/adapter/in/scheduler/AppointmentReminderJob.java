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
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.MedicalCenterJpaRepository;
import com.medsched.persistence.repository.PatientProfileJpaRepository;
import com.medsched.persistence.repository.SpecialtyJpaRepository;
import com.medsched.persistence.repository.TimeSlotJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Cron Job tự động quét và gửi email nhắc lịch khám trước 24 giờ.
 * Đáp ứng yêu cầu REQ-NOTI-02 trong Tài liệu Đặc tả Yêu cầu SRS (Chương 5.6):
 * "Là hệ thống, tôi cần tự động gửi email nhắc lịch trước giờ khám 24 giờ.
 *  Tiêu chí chấp nhận: Cron job chạy định kỳ quét các lịch hẹn sắp diễn ra trong ngày kế tiếp để gửi email nhắc nhở."
 */
@Component
public class AppointmentReminderJob {

    private static final Logger log = LoggerFactory.getLogger(AppointmentReminderJob.class);
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter
            .ofPattern("HH:mm - EEEE, 'ngày' dd/MM/yyyy", Locale.forLanguageTag("vi-VN"))
            .withZone(VIETNAM_ZONE);

    private final AppointmentJpaRepository appointmentJpaRepository;
    private final TimeSlotJpaRepository timeSlotJpaRepository;
    private final PatientProfileJpaRepository patientProfileJpaRepository;
    private final UserJpaRepository userJpaRepository;
    private final DoctorJpaRepository doctorJpaRepository;
    private final SpecialtyJpaRepository specialtyJpaRepository;
    private final MedicalCenterJpaRepository medicalCenterJpaRepository;
    private final EmailService emailService;

    public AppointmentReminderJob(AppointmentJpaRepository appointmentJpaRepository,
                                  TimeSlotJpaRepository timeSlotJpaRepository,
                                  PatientProfileJpaRepository patientProfileJpaRepository,
                                  UserJpaRepository userJpaRepository,
                                  DoctorJpaRepository doctorJpaRepository,
                                  SpecialtyJpaRepository specialtyJpaRepository,
                                  MedicalCenterJpaRepository medicalCenterJpaRepository,
                                  EmailService emailService) {
        this.appointmentJpaRepository = appointmentJpaRepository;
        this.timeSlotJpaRepository = timeSlotJpaRepository;
        this.patientProfileJpaRepository = patientProfileJpaRepository;
        this.userJpaRepository = userJpaRepository;
        this.doctorJpaRepository = doctorJpaRepository;
        this.specialtyJpaRepository = specialtyJpaRepository;
        this.medicalCenterJpaRepository = medicalCenterJpaRepository;
        this.emailService = emailService;
    }

    /**
     * Mặc định chạy vào lúc 08:00 sáng mỗi ngày để nhắc nhở tất cả ca khám vào ngày mai.
     * Cấu hình qua application.yml / biến môi trường: app.scheduler.reminder-cron
     */
    @Scheduled(cron = "${app.scheduler.reminder-cron:0 0 8 * * ?}")
    @Transactional
    public void scheduleDailyAppointmentReminder() {
        log.info("🔔 [REQ-NOTI-02] Bắt đầu tiến trình tự động quét lịch hẹn khám để gửi email nhắc nhở trước 24h...");
        int sentCount = triggerReminderScan();
        log.info("🔔 [REQ-NOTI-02] Hoàn tất tiến trình nhắc hẹn 24h. Tổng cộng đã gửi email cho {} ca khám.", sentCount);
    }

    /**
     * Phương thức thực thi quét và gửi email (có thể gọi tự động qua cron hoặc gọi thủ công/unit test).
     * @return Số lượng ca khám đã được gửi email nhắc hẹn thành công
     */
    @Transactional
    public int triggerReminderScan() {
        LocalDate tomorrow = LocalDate.now(VIETNAM_ZONE).plusDays(1);
        Instant startOfTomorrow = tomorrow.atStartOfDay(VIETNAM_ZONE).toInstant();
        Instant endOfTomorrow = tomorrow.atTime(LocalTime.MAX).atZone(VIETNAM_ZONE).toInstant();

        log.info("📅 [REQ-NOTI-02] Khung giờ quét lịch hẹn ngày mai: {} (từ {} đến {})",
                tomorrow, startOfTomorrow, endOfTomorrow);

        List<AppointmentEntity> confirmedAppointments = appointmentJpaRepository.findAll().stream()
                .filter(a -> a.getStatus() == AppointmentStatus.CONFIRMED)
                .toList();

        int sentCount = 0;

        for (AppointmentEntity appt : confirmedAppointments) {
            // Kiểm tra ca khám đã gửi email nhắc nhở chưa để tránh gửi trùng
            if (appt.getPatientSymptoms() != null && appt.getPatientSymptoms().contains("[REMINDER-24H-SENT]")) {
                continue;
            }

            if (appt.getSlotId() == null) {
                continue;
            }

            Optional<TimeSlotEntity> slotOpt = timeSlotJpaRepository.findById(appt.getSlotId());
            if (slotOpt.isEmpty() || slotOpt.get().getStartTime() == null) {
                continue;
            }

            Instant slotStartTime = slotOpt.get().getStartTime();
            // Lọc các ca khám diễn ra trong ngày mai (24h tới)
            if (slotStartTime.isBefore(startOfTomorrow) || slotStartTime.isAfter(endOfTomorrow)) {
                continue;
            }

            // 1. Trích xuất thông tin bệnh nhân & Email nhận thông báo
            String patientName = "Quý khách";
            String recipientEmail = null;

            if (appt.getPatientProfileId() != null) {
                Optional<PatientProfileEntity> profileOpt = patientProfileJpaRepository.findById(appt.getPatientProfileId());
                if (profileOpt.isPresent()) {
                    PatientProfileEntity profile = profileOpt.get();
                    if (profile.getFullName() != null && !profile.getFullName().isBlank()) {
                        patientName = profile.getFullName();
                    }
                    if (profile.getUserId() != null) {
                        Optional<UserEntity> userOpt = userJpaRepository.findById(profile.getUserId());
                        if (userOpt.isPresent() && userOpt.get().getEmail() != null && !userOpt.get().getEmail().isBlank()) {
                            recipientEmail = userOpt.get().getEmail().trim();
                        }
                    }
                }
            }

            if (recipientEmail == null) {
                log.warn("⚠️ [REQ-NOTI-02] Ca khám ID [{}] (Mã: {}) không tìm thấy email bệnh nhân để gửi nhắc hẹn.",
                        appt.getId(), appt.getBookingCode());
                continue;
            }

            // 2. Trích xuất thông tin Bác sĩ phụ trách & Chuyên khoa
            String doctorName = "Bác sĩ chuyên khoa";
            String specialtyName = "Khám đa khoa";

            if (appt.getDoctorId() != null) {
                Optional<DoctorEntity> docOpt = doctorJpaRepository.findById(appt.getDoctorId());
                if (docOpt.isPresent()) {
                    DoctorEntity doc = docOpt.get();
                    String title = (doc.getAcademicTitle() != null && !doc.getAcademicTitle().isBlank())
                            ? doc.getAcademicTitle() + " " : "BS. ";
                    if (doc.getUserId() != null) {
                        userJpaRepository.findById(doc.getUserId()).ifPresent(u -> {
                            if (u.getFullName() != null && !u.getFullName().isBlank()) {
                                // Gán tên bác sĩ
                            }
                        });
                        Optional<UserEntity> docUser = userJpaRepository.findById(doc.getUserId());
                        if (docUser.isPresent() && docUser.get().getFullName() != null) {
                            doctorName = title + docUser.get().getFullName();
                        }
                    }
                    if (doc.getSpecialtyId() != null) {
                        Optional<SpecialtyEntity> specOpt = specialtyJpaRepository.findById(doc.getSpecialtyId());
                        if (specOpt.isPresent() && specOpt.get().getName() != null) {
                            specialtyName = specOpt.get().getName();
                        }
                    }
                }
            }

            // 3. Trích xuất thông tin Cơ sở y tế / Phòng khám
            String centerName = "Phòng khám MedSched";
            String centerAddress = "TP. Hồ Chí Minh";

            if (appt.getMedicalCenterId() != null) {
                Optional<MedicalCenterEntity> centerOpt = medicalCenterJpaRepository.findById(appt.getMedicalCenterId());
                if (centerOpt.isPresent()) {
                    if (centerOpt.get().getName() != null) centerName = centerOpt.get().getName();
                    if (centerOpt.get().getAddress() != null) centerAddress = centerOpt.get().getAddress();
                }
            }

            // 4. Định dạng thời gian khám thân thiện
            String appointmentTimeFormatted = TIME_FORMATTER.format(slotStartTime);

            // 5. Gửi email nhắc hẹn tự động
            log.info("📧 [REQ-NOTI-02] Đang gửi email nhắc hẹn 24h tới [{}] cho ca khám [{}] vào lúc [{}]...",
                    recipientEmail, appt.getBookingCode(), appointmentTimeFormatted);

            emailService.sendAppointmentReminderEmail(
                    recipientEmail,
                    patientName,
                    appt.getBookingCode(),
                    doctorName,
                    specialtyName,
                    appointmentTimeFormatted,
                    centerName,
                    centerAddress
            );

            // 6. Đánh dấu đã gửi email để tránh trùng lặp nếu cron job chạy lại
            String existingSymptoms = (appt.getPatientSymptoms() == null) ? "" : appt.getPatientSymptoms() + "\n";
            appt.setPatientSymptoms(existingSymptoms + "[REMINDER-24H-SENT]: " + Instant.now());
            appt.setUpdatedAt(Instant.now());
            appointmentJpaRepository.save(appt);

            sentCount++;
        }

        return sentCount;
    }
}

