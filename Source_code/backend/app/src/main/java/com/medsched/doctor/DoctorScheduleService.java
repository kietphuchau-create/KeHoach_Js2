package com.medsched.doctor;

import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.entity.DoctorScheduleEntity;
import com.medsched.persistence.entity.TimeSlotEntity;
import com.medsched.persistence.enums.ScheduleStatus;
import com.medsched.persistence.enums.SlotStatus;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.DoctorScheduleJpaRepository;
import com.medsched.persistence.repository.TimeSlotJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.entity.PatientProfileEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.PatientProfileJpaRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class DoctorScheduleService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm").withZone(VN_ZONE);

    /** Danh mục buồng khám lâm sàng chính thức do Quản Trị Viên (Admin) phê duyệt */
    public static final Set<String> APPROVED_CLINIC_ROOMS = Set.of(
            "P.101", "P.102", "P.103", "P.104", "P.105",
            "P.201", "P.202", "P.205", "P.208", "P.209",
            "P.301", "P.302"
    );

    public static boolean isValidClinicRoom(String room) {
        if (room == null || room.isBlank()) return false;
        String r = room.trim().toUpperCase();
        if (APPROVED_CLINIC_ROOMS.contains(r)) return true;
        return r.matches("^P\\.[0-9]{3}[A-Z]?$") || r.matches("^PHÒNG\\s+[0-9]{3}[A-Z]?$");
    }

    /**
     * Cấu hình Chế Độ Xếp Lịch Toàn Viện:
     * - autoScheduleEnabled = true: Chế độ Tự Động. Hệ thống tự quét và sinh ca trực chuẩn 7 ngày cho toàn bộ Bác sĩ.
     * - autoScheduleEnabled = false: Chế độ Thủ Công (Demo Luồng Chính). Bác sĩ tự đặt lịch không giới hạn số ngày,
     *   nhưng buộc một ngày làm việc phải đạt tối thiểu minWorkHoursPerDay (mặc định 6 tiếng) mới được mở đăng ký ngày tiếp theo.
     */
    private static volatile boolean autoScheduleEnabled = false; // Mặc định mở chế độ Thủ Công cho luồng demo
    private static volatile int minWorkHoursPerDay = 6;
    private static volatile boolean devMode247 = false; // Chế độ Develop 24/7 (hoạt động ngoài giờ hành chính)
    private static final Set<String> devModeScheduleIds = java.util.concurrent.ConcurrentHashMap.newKeySet();
    private static volatile Instant devModeStartedAt = null;
    private static volatile String currentDevSessionId = null;

    public static boolean isDevMode247Active() {
        return devMode247;
    }

    public static String getCurrentDevSessionId() {
        return currentDevSessionId;
    }

    public static Instant getDevModeStartedAt() {
        return devModeStartedAt;
    }

    public static void setDevMode247Active(boolean active) {
        if (active && !devMode247) {
            devModeStartedAt = Instant.now();
            if (currentDevSessionId == null) {
                currentDevSessionId = UUID.randomUUID().toString();
            }
        } else if (!active) {
            devModeStartedAt = null;
            currentDevSessionId = null;
        }
        devMode247 = active;
    }

    public boolean isDevMode247Enabled() {
        return devMode247;
    }

    public static boolean isAutoScheduleActive() {
        return autoScheduleEnabled;
    }

    public boolean isAutoScheduleEnabled() {
        return autoScheduleEnabled;
    }

    public static void setAutoScheduleActive(boolean active) {
        autoScheduleEnabled = active;
    }

    public static int getMinWorkHoursPerDayGlobal() {
        return minWorkHoursPerDay;
    }

    public static void setMinWorkHoursPerDayGlobal(int hours) {
        minWorkHoursPerDay = hours;
    }

    public DoctorScheduleDtos.ScheduleModeDto getScheduleMode() {
        String mode = autoScheduleEnabled ? "AUTO" : "MANUAL";
        String desc = autoScheduleEnabled
                ? "Chế độ Tự Động Toàn Viện: Hệ thống tự động quét và sinh ca trực chuẩn 7 ngày cho toàn bộ Bác sĩ."
                : "Chế độ Bác Sĩ Tự Đặt Lịch Thủ Công (Demo Luồng Chính): Bác sĩ tự do mở lịch không giới hạn số ngày, "
                  + "bắt buộc mỗi ngày làm việc phải đạt tối thiểu " + minWorkHoursPerDay + " tiếng mới được mở đăng ký ngày tiếp theo.";
        return new DoctorScheduleDtos.ScheduleModeDto(autoScheduleEnabled, minWorkHoursPerDay, mode, desc, devMode247);
    }

    public record CleanupResult(int cleanedSchedules, int cleanedAppointments) {}

    @Transactional
    public com.medsched.persistence.entity.DevModeSessionEntity activateDevModeSession(String activatedBy, String notes) {
        devMode247 = true;
        Instant now = Instant.now();
        devModeStartedAt = now;
        String sessionId = UUID.randomUUID().toString();
        currentDevSessionId = sessionId;

        if (devModeSessionRepository != null) {
            List<com.medsched.persistence.entity.DevModeSessionEntity> activeSessions = devModeSessionRepository.findByIsActiveTrue();
            for (com.medsched.persistence.entity.DevModeSessionEntity s : activeSessions) {
                s.setActive(false);
                s.setEndedAt(now);
                devModeSessionRepository.save(s);
            }

            com.medsched.persistence.entity.DevModeSessionEntity session = new com.medsched.persistence.entity.DevModeSessionEntity(
                    sessionId,
                    true,
                    now,
                    null,
                    activatedBy != null ? activatedBy : "ADMIN",
                    notes != null ? notes : "Bật chế độ Develop 24/7 từ giao diện Quản trị",
                    now,
                    now
            );
            return devModeSessionRepository.save(session);
        }
        return null;
    }

    @Transactional
    public CleanupResult deactivateDevModeSession(boolean cleanupTestData) {
        CleanupResult result = new CleanupResult(0, 0);
        if (cleanupTestData) {
            result = cleanupDevModeTestData();
        }

        Instant now = Instant.now();
        if (devModeSessionRepository != null) {
            List<com.medsched.persistence.entity.DevModeSessionEntity> activeSessions = devModeSessionRepository.findByIsActiveTrue();
            for (com.medsched.persistence.entity.DevModeSessionEntity s : activeSessions) {
                s.setActive(false);
                s.setEndedAt(now);
                s.setCleanedSchedulesCount(result.cleanedSchedules());
                s.setCleanedAppointmentsCount(result.cleanedAppointments());
                devModeSessionRepository.save(s);
            }
        }

        devMode247 = false;
        currentDevSessionId = null;
        devModeStartedAt = null;
        devModeScheduleIds.clear();

        return result;
    }

    @Transactional
    public CleanupResult cleanupDevModeTestData() {
        Set<String> targetScheduleIds = new HashSet<>(devModeScheduleIds);

        // 1. Tìm tất cả ca trực được tạo gắn dev_session_id hoặc is_test_data = true
        if (currentDevSessionId != null && doctorScheduleRepository != null) {
            doctorScheduleRepository.findByDevSessionId(currentDevSessionId).forEach(s -> targetScheduleIds.add(s.getId()));
        }
        if (doctorScheduleRepository != null) {
            doctorScheduleRepository.findByIsTestDataTrue().forEach(s -> targetScheduleIds.add(s.getId()));
        }

        if (devModeStartedAt != null) {
            List<DoctorScheduleEntity> all = doctorScheduleRepository.findAll();
            for (DoctorScheduleEntity s : all) {
                if (s.getCreatedAt() != null && !s.getCreatedAt().isBefore(devModeStartedAt)) {
                    targetScheduleIds.add(s.getId());
                }
            }
        }

        int cleanedAppointments = 0;
        int cleanedSchedules = 0;

        if (!targetScheduleIds.isEmpty()) {
            List<TimeSlotEntity> slotsToDelete = new ArrayList<>();
            for (String schedId : targetScheduleIds) {
                slotsToDelete.addAll(timeSlotRepository.findByScheduleIdOrderByStartTimeAsc(schedId));
            }

            if (!slotsToDelete.isEmpty()) {
                List<String> slotIds = slotsToDelete.stream().map(TimeSlotEntity::getId).toList();
                List<AppointmentEntity> appointments = appointmentJpaRepository.findBySlotIdIn(slotIds);

                if (!appointments.isEmpty()) {
                    cleanedAppointments = appointments.size();
                    if (paymentJpaRepository != null) {
                        for (AppointmentEntity appt : appointments) {
                            try {
                                List<com.medsched.persistence.entity.PaymentEntity> payments = paymentJpaRepository.findByAppointmentId(appt.getId());
                                if (payments != null && !payments.isEmpty()) {
                                    paymentJpaRepository.deleteAll(payments);
                                }
                            } catch (Exception ignored) {}
                        }
                    }
                    appointmentJpaRepository.deleteAll(appointments);
                    appointmentJpaRepository.flush();
                }

                timeSlotRepository.deleteAll(slotsToDelete);
                timeSlotRepository.flush();
            }

            doctorScheduleRepository.deleteAllById(targetScheduleIds);
            doctorScheduleRepository.flush();
            cleanedSchedules = targetScheduleIds.size();
        }

        // 2. Dọn dẹp các ca khám gắn dev_session_id, is_test_data = true, hoặc vãng lai tạo trong phiên 24/7
        List<AppointmentEntity> testAppointments = new ArrayList<>();
        if (currentDevSessionId != null) {
            testAppointments.addAll(appointmentJpaRepository.findByDevSessionId(currentDevSessionId));
        }
        for (AppointmentEntity testApp : appointmentJpaRepository.findByIsTestDataTrue()) {
            if (!testAppointments.contains(testApp)) {
                testAppointments.add(testApp);
            }
        }
        if (devModeStartedAt != null) {
            appointmentJpaRepository.findAll().stream()
                    .filter(a -> a.getCreatedAt() != null && !a.getCreatedAt().isBefore(devModeStartedAt))
                    .forEach(a -> {
                        if (!testAppointments.contains(a)) testAppointments.add(a);
                    });
        }

        if (!testAppointments.isEmpty()) {
            cleanedAppointments += testAppointments.size();
            for (AppointmentEntity w : testAppointments) {
                try {
                    if (paymentJpaRepository != null) {
                        var payments = paymentJpaRepository.findByAppointmentId(w.getId());
                        if (payments != null && !payments.isEmpty()) paymentJpaRepository.deleteAll(payments);
                    }
                } catch (Exception ignored) {}
            }
            appointmentJpaRepository.deleteAll(testAppointments);
            appointmentJpaRepository.flush();
        }

        devModeScheduleIds.clear();
        return new CleanupResult(cleanedSchedules, cleanedAppointments);
    }

    /**
     * Dọn dẹp sạch toàn bộ ca trực chưa có người đặt lịch (đưa hệ thống về trạng thái 0 ca).
     */
    @Transactional
    public int cleanupAllUnbookedSchedules() {
        List<DoctorScheduleEntity> all = doctorScheduleRepository.findAll();
        int count = 0;
        for (DoctorScheduleEntity s : all) {
            List<TimeSlotEntity> slots = timeSlotRepository.findByScheduleIdOrderByStartTimeAsc(s.getId());
            boolean hasBooked = slots.stream().anyMatch(slot -> slot.getStatus() == SlotStatus.BOOKED);
            if (!hasBooked) {
                if (!slots.isEmpty()) {
                    timeSlotRepository.deleteAll(slots);
                    timeSlotRepository.flush();
                }
                doctorScheduleRepository.delete(s);
                doctorScheduleRepository.flush();
                count++;
            }
        }
        return count;
    }

    @Transactional
    public DoctorScheduleDtos.ScheduleModeDto updateScheduleMode(DoctorScheduleDtos.UpdateScheduleModeRequest req) {
        autoScheduleEnabled = req.autoScheduleEnabled();
        if (req.minWorkHoursPerDay() != null && req.minWorkHoursPerDay() > 0) {
            minWorkHoursPerDay = req.minWorkHoursPerDay();
        }
        int cleanedScheds = 0;
        int cleanedAppts = 0;
        if (req.devMode247() != null) {
            boolean nextDev = req.devMode247();
            if (nextDev && !devMode247) {
                activateDevModeSession("ADMIN", "Kích hoạt từ updateScheduleMode");
            } else if (!nextDev && devMode247) {
                CleanupResult result = deactivateDevModeSession(Boolean.TRUE.equals(req.cleanupTestData()));
                cleanedScheds = result.cleanedSchedules();
                cleanedAppts = result.cleanedAppointments();
            }
        } else if (Boolean.TRUE.equals(req.cleanupTestData())) {
            CleanupResult result = cleanupDevModeTestData();
            cleanedScheds = result.cleanedSchedules();
            cleanedAppts = result.cleanedAppointments();
        }

        String mode = autoScheduleEnabled ? "AUTO" : "MANUAL";
        String desc = autoScheduleEnabled
                ? "Chế độ Tự Động Toàn Viện: Hệ thống tự động quét và sinh ca trực chuẩn 7 ngày cho toàn bộ Bác sĩ."
                : "Chế độ Bác Sĩ Tự Đặt Lịch Thủ Công (Demo Luồng Chính): Bác sĩ tự do mở lịch không giới hạn số ngày, "
                  + "bắt buộc mỗi ngày làm việc phải đạt tối thiểu " + minWorkHoursPerDay + " tiếng mới được mở đăng ký ngày tiếp theo.";
        return new DoctorScheduleDtos.ScheduleModeDto(autoScheduleEnabled, minWorkHoursPerDay, mode, desc, devMode247, cleanedScheds, cleanedAppts);
    }

    public DoctorScheduleDtos.DoctorDailyHoursSummaryDto getDoctorDailyHoursSummary(String userId, String doctorId) {
        String targetDoctorId = resolveDoctorId(userId, doctorId);
        LocalDate today = LocalDate.now(VN_ZONE);
        List<DoctorScheduleEntity> schedules = doctorScheduleRepository.findByDoctorIdAndWorkDateBetweenOrderByWorkDateAscStartTimeAsc(
                targetDoctorId, today, today.plusYears(1)
        );

        Map<String, Double> dailyHours = new LinkedHashMap<>();
        List<String> incompleteDates = new ArrayList<>();
        long minMinutes = (long) minWorkHoursPerDay * 60;

        Map<LocalDate, Long> minutesMap = new LinkedHashMap<>();
        for (DoctorScheduleEntity s : schedules) {
            if (s.getStatus() == ScheduleStatus.ACTIVE && s.getStartTime() != null && s.getEndTime() != null) {
                long mins = java.time.Duration.between(s.getStartTime(), s.getEndTime()).toMinutes();
                minutesMap.merge(s.getWorkDate(), mins, Long::sum);
            }
        }

        for (Map.Entry<LocalDate, Long> e : minutesMap.entrySet()) {
            double hrs = Math.round((e.getValue() / 60.0) * 10.0) / 10.0;
            dailyHours.put(e.getKey().toString(), hrs);
            if (e.getValue() < minMinutes) {
                incompleteDates.add(e.getKey().toString());
            }
        }

        return new DoctorScheduleDtos.DoctorDailyHoursSummaryDto(
                dailyHours, incompleteDates, minWorkHoursPerDay, autoScheduleEnabled
        );
    }

    private boolean isCallerAdmin(String userId) {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities() != null) {
            boolean hasAdmin = auth.getAuthorities().stream().anyMatch(a ->
                    a.getAuthority().equals("ROLE_ADMIN")
                    || a.getAuthority().startsWith("ROLE_ADMIN@")
                    || a.getAuthority().equals("ROLE_STAFF")
                    || a.getAuthority().startsWith("ROLE_STAFF@")
            );
            if (hasAdmin) return true;
        }
        if (userId != null && userMedicalCenterRoleJpaRepository != null) {
            boolean hasRole = userMedicalCenterRoleJpaRepository.findByUserIdAndActiveTrue(userId).stream()
                    .anyMatch(r -> r.getRole() == com.medsched.persistence.enums.UserRole.ROLE_ADMIN
                                || r.getRole() == com.medsched.persistence.enums.UserRole.ROLE_STAFF);
            if (hasRole) return true;
        }
        if (userId != null && (userId.startsWith("u-admin") || userId.contains("admin"))) {
            return true;
        }
        return false;
    }

    private final DoctorScheduleJpaRepository doctorScheduleRepository;
    private final TimeSlotJpaRepository timeSlotRepository;
    private final DoctorJpaRepository doctorRepository;
    private final UserJpaRepository userJpaRepository;
    private final AppointmentJpaRepository appointmentJpaRepository;
    private final PatientProfileJpaRepository patientProfileJpaRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.medsched.persistence.repository.SpecialtyJpaRepository specialtyJpaRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.medsched.persistence.repository.MedicalCenterJpaRepository medicalCenterJpaRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.medsched.persistence.repository.UserMedicalCenterRoleJpaRepository userMedicalCenterRoleJpaRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.medsched.persistence.repository.PaymentJpaRepository paymentJpaRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.medsched.persistence.repository.DevModeSessionJpaRepository devModeSessionRepository;

    @jakarta.annotation.PostConstruct
    public void initDevModeFromDatabase() {
        if (devModeSessionRepository != null) {
            devModeSessionRepository.findFirstByIsActiveTrueOrderByStartedAtDesc().ifPresentOrElse(session -> {
                devMode247 = true;
                currentDevSessionId = session.getId();
                devModeStartedAt = session.getStartedAt();
            }, () -> {
                devMode247 = false;
                currentDevSessionId = null;
                devModeStartedAt = null;
            });
        }
    }

    public void setDevModeSessionJpaRepository(com.medsched.persistence.repository.DevModeSessionJpaRepository devModeSessionRepository) {
        this.devModeSessionRepository = devModeSessionRepository;
    }

    @org.springframework.beans.factory.annotation.Autowired
    public DoctorScheduleService(DoctorScheduleJpaRepository doctorScheduleRepository,
                                 TimeSlotJpaRepository timeSlotRepository,
                                 DoctorJpaRepository doctorRepository,
                                 UserJpaRepository userJpaRepository,
                                 AppointmentJpaRepository appointmentJpaRepository,
                                 PatientProfileJpaRepository patientProfileJpaRepository) {
        this.doctorScheduleRepository = doctorScheduleRepository;
        this.timeSlotRepository = timeSlotRepository;
        this.doctorRepository = doctorRepository;
        this.userJpaRepository = userJpaRepository;
        this.appointmentJpaRepository = appointmentJpaRepository;
        this.patientProfileJpaRepository = patientProfileJpaRepository;
    }

    public DoctorScheduleService(DoctorScheduleJpaRepository doctorScheduleRepository,
                                 TimeSlotJpaRepository timeSlotRepository,
                                 DoctorJpaRepository doctorRepository,
                                 UserJpaRepository userJpaRepository) {
        this(doctorScheduleRepository, timeSlotRepository, doctorRepository, userJpaRepository, null, null);
    }

    public void setSpecialtyJpaRepository(com.medsched.persistence.repository.SpecialtyJpaRepository specialtyJpaRepository) {
        this.specialtyJpaRepository = specialtyJpaRepository;
    }

    private boolean isSameBranch(DoctorEntity doc1, DoctorEntity doc2) {
        if (specialtyJpaRepository == null || doc1 == null || doc2 == null) {
            return true;
        }
        if (doc1.getSpecialtyId() == null || doc2.getSpecialtyId() == null) {
            return true;
        }
        String branch1 = specialtyJpaRepository.findById(doc1.getSpecialtyId())
                .map(com.medsched.persistence.entity.SpecialtyEntity::getMedicalCenterId)
                .orElse(null);
        String branch2 = specialtyJpaRepository.findById(doc2.getSpecialtyId())
                .map(com.medsched.persistence.entity.SpecialtyEntity::getMedicalCenterId)
                .orElse(null);
        if (branch1 != null && branch2 != null) {
            return branch1.equals(branch2);
        }
        return true;
    }

    private String resolveDoctorId(String userId, String queryDoctorId) {
        if (queryDoctorId != null && !queryDoctorId.isBlank()) {
            return queryDoctorId;
        }
        if (userId != null && !userId.isBlank()) {
            List<DoctorEntity> docs = doctorRepository.findByUserId(userId);
            if (!docs.isEmpty()) {
                return docs.get(0).getId();
            }
        }
        List<DoctorEntity> all = doctorRepository.findAll();
        if (!all.isEmpty()) {
            return all.get(0).getId();
        }
        throw new ResourceNotFoundException("Không tìm thấy thông tin Bác sĩ trong hệ thống.");
    }

    @Transactional
    public List<DoctorScheduleDtos.DoctorScheduleDto> getDoctorSchedules(String userId, String queryDoctorId, LocalDate from, LocalDate to) {
        // 1. Trường hợp truy vấn đích danh 1 Bác sĩ cụ thể
        if (queryDoctorId != null && !queryDoctorId.isBlank() && !queryDoctorId.equalsIgnoreCase("ALL")) {
            List<DoctorScheduleEntity> schedules;
            if (from != null && to != null) {
                schedules = doctorScheduleRepository.findByDoctorIdAndWorkDateBetweenOrderByWorkDateAscStartTimeAsc(queryDoctorId, from, to);
            } else {
                schedules = doctorScheduleRepository.findByDoctorIdOrderByWorkDateAscStartTimeAsc(queryDoctorId);
            }
            return schedules.stream().map(this::mapToDto).toList();
        }

        // 2. Không truyền queryDoctorId, nhưng người gọi là Bác sĩ đang xem ca trực của chính mình
        boolean isExplicitAll = "ALL".equalsIgnoreCase(queryDoctorId);
        if (!isExplicitAll && userId != null && !userId.isBlank()) {
            List<DoctorEntity> userDocs = doctorRepository.findByUserId(userId);
            if (!userDocs.isEmpty()) {
                String myDoctorId = userDocs.get(0).getId();
                List<DoctorScheduleEntity> schedules;
                if (from != null && to != null) {
                    schedules = doctorScheduleRepository.findByDoctorIdAndWorkDateBetweenOrderByWorkDateAscStartTimeAsc(myDoctorId, from, to);
                } else {
                    schedules = doctorScheduleRepository.findByDoctorIdOrderByWorkDateAscStartTimeAsc(myDoctorId);
                }
                return schedules.stream().map(this::mapToDto).toList();
            }
        }

        // 3. Quản trị viên (Admin), Lễ tân hoặc điều phối xem toàn bộ ca trực của TẤT CẢ Bác sĩ trong viện
        List<DoctorScheduleEntity> schedules;
        if (from != null && to != null) {
            if (from.equals(to)) {
                schedules = doctorScheduleRepository.findByWorkDateOrderByStartTimeAsc(from);
            } else {
                schedules = doctorScheduleRepository.findByWorkDateBetweenOrderByWorkDateAscStartTimeAsc(from, to);
            }
        } else {
            schedules = doctorScheduleRepository.findAll();
        }

        return schedules.stream().map(this::mapToDto).toList();
    }

    /**
     * Tự động xếp lịch trực mặc định cho Bác sĩ nếu chưa đăng ký trước
     * Ca sáng: 08:00 - 12:00, Ca chiều: 13:30 - 17:00
     */
    private void ensureDefaultTodaySchedule(String doctorId, LocalDate targetDate) {
        DoctorEntity currentDoctor = doctorRepository.findById(doctorId).orElse(null);
        if (currentDoctor == null) {
            return;
        }

        // Kiểm tra xem tài khoản bác sĩ có đang hoạt động không (nếu đã bị vô hiệu hóa hoặc nghỉ phép dài hạn thì không sinh lịch)
        if (currentDoctor.getUserId() != null) {
            UserEntity user = userJpaRepository.findById(currentDoctor.getUserId()).orElse(null);
            if (user != null && !user.isActive()) {
                return;
            }
        }

        // Kiểm tra xem chính bác sĩ này hoặc cùng user_id ở chi nhánh khác đã có ca trực trong targetDate chưa
        if (currentDoctor.getUserId() != null) {
            List<DoctorEntity> userDocs = doctorRepository.findByUserId(currentDoctor.getUserId());
            List<String> docIds = userDocs.stream().map(DoctorEntity::getId).toList();
            List<DoctorScheduleEntity> existingUserSchedules = doctorScheduleRepository.findByDoctorIdInAndWorkDateBetween(
                    docIds, targetDate, targetDate
            );
            if (!existingUserSchedules.isEmpty()) {
                return;
            }
        } else {
            List<DoctorScheduleEntity> existing = doctorScheduleRepository.findByDoctorIdAndWorkDate(doctorId, targetDate);
            if (!existing.isEmpty()) {
                return;
            }
        }

        Instant now = Instant.now();
        int duration = 30;

        List<LocalTime[]> defaultShifts = List.of(
                new LocalTime[]{LocalTime.of(8, 0), LocalTime.of(12, 0)},
                new LocalTime[]{LocalTime.of(13, 30), LocalTime.of(17, 0)}
        );

        for (LocalTime[] shift : defaultShifts) {
            LocalTime start = shift[0];
            LocalTime end = shift[1];
            String scheduleId = UUID.randomUUID().toString();
            DoctorScheduleEntity schedule = new DoctorScheduleEntity(
                    scheduleId,
                    doctorId,
                    targetDate,
                    start,
                    end,
                    duration,
                    ScheduleStatus.ACTIVE,
                    now,
                    now
            );
            schedule = doctorScheduleRepository.save(schedule);
            if (devMode247) {
                schedule.setDevSessionId(currentDevSessionId);
                schedule.setTestData(true);
                schedule = doctorScheduleRepository.save(schedule);
                devModeScheduleIds.add(schedule.getId());
            }

            LocalTime cursor = start;
            List<TimeSlotEntity> createdSlots = new ArrayList<>();
            while (cursor.isBefore(end)) {
                LocalTime next = cursor.plusMinutes(duration);
                if (!next.isAfter(cursor) || next.isAfter(end)) {
                    break;
                }
                Instant slotStart = targetDate.atTime(cursor).atZone(VN_ZONE).toInstant();
                Instant slotEnd = targetDate.atTime(next).atZone(VN_ZONE).toInstant();

                TimeSlotEntity slot = new TimeSlotEntity(
                        UUID.randomUUID().toString(),
                        schedule.getId(),
                        doctorId,
                        slotStart,
                        slotEnd,
                        SlotStatus.AVAILABLE,
                        now,
                        now
                );
                createdSlots.add(slot);
                cursor = next;
            }
            timeSlotRepository.saveAll(createdSlots);
        }
    }

    @Transactional
    public DoctorScheduleDtos.DoctorScheduleDto createSchedule(String userId, DoctorScheduleDtos.CreateScheduleRequest request) {
        String targetDoctorId = resolveDoctorId(userId, request.doctorId());

        if (request.startTime().isAfter(request.endTime()) || request.startTime().equals(request.endTime())) {
            throw new IllegalArgumentException("Giờ bắt đầu phải trước giờ kết thúc ca trực.");
        }

        int duration = (request.slotDurationMinutes() != null && request.slotDurationMinutes() > 0)
                ? request.slotDurationMinutes()
                : 30;

        boolean isAdmin = isCallerAdmin(userId);
        LocalDate today = LocalDate.now(VN_ZONE);

        if (request.workDate().isBefore(today)) {
            throw new IllegalArgumentException("Không thể đăng ký ca trực cho ngày trong quá khứ: " + request.workDate());
        }

        // Bổ sung kiểm soát thời gian thực khi đăng ký ca trực trong ngày hôm nay:
        if (request.workDate().equals(today) && !isAdmin) {
            LocalTime nowTime = LocalTime.now(VN_ZONE);
            if (!request.endTime().isAfter(nowTime)) {
                throw new IllegalArgumentException(String.format(
                        "Ca trực (%s - %s) đã kết thúc trong quá khứ của ngày hôm nay (hiện tại là %s). Vui lòng chọn ca trực tiếp theo hoặc ngày mai!",
                        TIME_FORMATTER.format(request.startTime()),
                        TIME_FORMATTER.format(request.endTime()),
                        TIME_FORMATTER.format(nowTime)
                ));
            }
        }

        // Quy tắc đăng ký trước:
        // - Bác sĩ tự đăng ký ca trực định kỳ trước tối thiểu 1 ngày (từ ngày mai trở đi).
        // - Quản Trị Viên (Admin) có toàn quyền phân công ca trực trong ngày hôm nay để xử lý ca khẩn cấp hoặc điều phối nhân sự.
        // - Khi devMode247 == true: Bác sĩ được phép đăng ký ca trực ngay hôm nay để kiểm thử và demo 24/7.
        if (request.workDate().equals(today) && !isAdmin && !devMode247) {
            throw new IllegalArgumentException("Theo quy định phòng khám, Bác sĩ chỉ được đăng ký ca trực trước tối thiểu 1 ngày (từ ngày mai trở đi). Ca trực hôm nay do Quản Trị Viên (Admin) trực tiếp phân công và điều phối.");
        }

        // Chặn đăng ký ca trực vào cuối tuần (Thứ Bảy & Chủ Nhật) nếu không phải do Admin phân công (hoặc bật devMode247)
        DayOfWeek dow = request.workDate().getDayOfWeek();
        if ((dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) && !isAdmin && !devMode247) {
            throw new IllegalArgumentException("Phòng khám không mở đăng ký ca trực cuối tuần tự do cho Bác sĩ. Ca trực cuối tuần chỉ áp dụng khi Quản Trị Viên (Admin) phê duyệt phân công.");
        }

        // Khung giờ làm việc phòng khám hỗ trợ từ sáng sớm đến ca tối (07:00 - 21:30, hoặc 00:00 - 23:59 nếu devMode247)
        LocalTime minStartTime = devMode247 ? LocalTime.of(0, 0) : LocalTime.of(7, 0);
        LocalTime maxEndTime = devMode247 ? LocalTime.of(23, 59) : LocalTime.of(21, 30);
        if (request.startTime().isBefore(minStartTime) || request.endTime().isAfter(maxEndTime)) {
            throw new IllegalArgumentException("Ca trực phải nằm trong khung giờ làm việc của hệ thống phòng khám (" + minStartTime + " - " + maxEndTime + ").");
        }
        if (!devMode247 && request.startTime().isAfter(LocalTime.of(12, 0)) && request.endTime().isBefore(LocalTime.of(13, 30))) {
            throw new IllegalArgumentException("Không thể đăng ký ca trực hoàn toàn nằm trong khung giờ nghỉ trưa của phòng khám (12:00 - 13:30).");
        }

        DoctorEntity currentDoctor = doctorRepository.findById(targetDoctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin Bác sĩ trong hệ thống."));

        String currentAssignedRoom = (currentDoctor.getRoomNumber() != null && !currentDoctor.getRoomNumber().isBlank())
                ? currentDoctor.getRoomNumber().trim().toUpperCase()
                : "P.208";

        String targetRoom = (request.roomNumber() != null && !request.roomNumber().isBlank())
                ? request.roomNumber().trim().toUpperCase()
                : currentAssignedRoom;

        // Chặn không cho phép tự ý nhập buồng khám ngoài quy chuẩn phòng khám (Admin có quyền thêm buồng linh hoạt)
        if (!isValidClinicRoom(targetRoom) && !isAdmin) {
            throw new IllegalArgumentException("Buồng khám [" + targetRoom
                    + "] không hợp lệ hoặc chưa được Quản Trị Viên (Admin) phê duyệt. Vui lòng chỉ chọn các buồng khám hợp lệ: "
                    + String.join(", ", APPROVED_CLINIC_ROOMS));
        }

        // 1. Kiểm tra chồng chéo ca trực của CHÍNH bác sĩ đó trong ngày
        List<DoctorScheduleEntity> existingInDate = doctorScheduleRepository.findByDoctorIdAndWorkDate(targetDoctorId, request.workDate());
        for (DoctorScheduleEntity ex : existingInDate) {
            if (ex.getStatus() == ScheduleStatus.ACTIVE) {
                // Kiểm tra chồng chéo giờ
                boolean overlap = request.startTime().isBefore(ex.getEndTime()) && request.endTime().isAfter(ex.getStartTime());
                if (overlap) {
                    throw new IllegalArgumentException("Bác sĩ đã có ca trực trùng khung giờ ("
                            + ex.getStartTime() + " - " + ex.getEndTime() + ") trong ngày " + request.workDate());
                }
            }
        }

        // 2. Quy tắc kiểm soát công suất phòng khám (Tối thiểu 6 tiếng/ngày mới cho qua ngày tiếp theo):
        // Áp dụng cho Bác sĩ khi tự đăng ký lịch thủ công (Demo luồng chính). Khi bật devMode247 sẽ bỏ qua ràng buộc này.
        if (!isAdmin && !devMode247) {
            LocalDate fromDate = today;
            LocalDate toDate = today.plusYears(1);
            List<DoctorScheduleEntity> allFutureSchedules = doctorScheduleRepository.findByDoctorIdAndWorkDateBetweenOrderByWorkDateAscStartTimeAsc(
                    targetDoctorId, fromDate, toDate
            );

            Map<LocalDate, Long> dailyMinutesMap = new LinkedHashMap<>();
            for (DoctorScheduleEntity s : allFutureSchedules) {
                if (s.getStatus() == ScheduleStatus.ACTIVE && s.getStartTime() != null && s.getEndTime() != null) {
                    long mins = java.time.Duration.between(s.getStartTime(), s.getEndTime()).toMinutes();
                    dailyMinutesMap.merge(s.getWorkDate(), mins, Long::sum);
                }
            }

            long minRequiredMinutes = (long) minWorkHoursPerDay * 60; // 360 phút = 6 tiếng
            // Nếu ngày đăng ký là một ngày mới (chưa có ca nào), kiểm tra xem các ngày đã đăng ký trước đó có ngày nào chưa đủ 6 tiếng không
            if (!dailyMinutesMap.containsKey(request.workDate())) {
                for (Map.Entry<LocalDate, Long> entry : dailyMinutesMap.entrySet()) {
                    LocalDate registeredDate = entry.getKey();
                    long registeredMins = entry.getValue();
                    if (registeredMins > 0 && registeredMins < minRequiredMinutes) {
                        double currentHrs = Math.round((registeredMins / 60.0) * 10.0) / 10.0;
                        double missingHrs = Math.round(((minRequiredMinutes - registeredMins) / 60.0) * 10.0) / 10.0;
                        throw new IllegalArgumentException(String.format(
                                "Theo quy định kiểm soát công suất phòng khám: Bác sĩ phải hoàn thành tối thiểu %d tiếng làm việc trong ngày %s (hiện tại mới đạt %.1f tiếng, còn thiếu %.1f tiếng) trước khi được chuyển sang đăng ký lịch cho ngày tiếp theo (%s).",
                                minWorkHoursPerDay, registeredDate, currentHrs, missingHrs, request.workDate()
                        ));
                    }
                }
            }
        }

        // c. Kiểm tra đa chi nhánh theo user_id nếu bác sĩ có hồ sơ ở nhiều chi nhánh
        if (currentDoctor.getUserId() != null && !isAdmin) {
            List<DoctorEntity> userDocs = doctorRepository.findByUserId(currentDoctor.getUserId());
            List<String> docIds = userDocs.stream().map(DoctorEntity::getId).toList();
            if (docIds.size() > 1) {
                List<DoctorScheduleEntity> otherBranchSchedules = doctorScheduleRepository.findByDoctorIdInAndWorkDateBetween(
                        docIds, request.workDate(), request.workDate()
                );
                for (DoctorScheduleEntity obs : otherBranchSchedules) {
                    if (obs.getStatus() == ScheduleStatus.ACTIVE && !obs.getDoctorId().equals(targetDoctorId)) {
                        throw new IllegalArgumentException(String.format(
                                "Quy định phòng khám: Bác sĩ đã có ca trực tại chi nhánh khác trong ngày %s. " +
                                "Hệ thống chỉ cho phép Bác sĩ trực tại 1 CHI NHÁNH DUY NHẤT trong một ngày làm việc!",
                                request.workDate()
                        ));
                    }
                }
            }
        }

        // 2. [FIX DEFECT-ROOM-CONFLICT-01]: Kiểm tra XUNG ĐỘT BUỒNG KHÁM VỚI BÁC SĨ KHÁC
        List<DoctorScheduleEntity> allSchedulesOnDate = doctorScheduleRepository.findByWorkDate(request.workDate());
        for (DoctorScheduleEntity ex : allSchedulesOnDate) {
            if (ex.getStatus() == ScheduleStatus.ACTIVE && !ex.getDoctorId().equals(targetDoctorId)) {
                DoctorEntity otherDoctor = doctorRepository.findById(ex.getDoctorId()).orElse(null);
                if (otherDoctor != null) {
                    if (!isSameBranch(currentDoctor, otherDoctor)) {
                        // Khác chi nhánh -> buồng khám vật lý không xung đột
                        continue;
                    }
                    String otherRoom = otherDoctor.getRoomNumber() != null ? otherDoctor.getRoomNumber().trim().toUpperCase() : "";
                    if (targetRoom.equalsIgnoreCase(otherRoom)) {
                        boolean overlap = request.startTime().isBefore(ex.getEndTime()) && request.endTime().isAfter(ex.getStartTime());
                        if (overlap) {
                            String otherDoctorName = userJpaRepository.findById(otherDoctor.getUserId())
                                    .map(UserEntity::getFullName)
                                    .orElse("Bác sĩ khác");
                            if (otherDoctor.getAcademicTitle() != null && !otherDoctor.getAcademicTitle().isBlank()) {
                                otherDoctorName = otherDoctor.getAcademicTitle() + " " + otherDoctorName;
                            }
                            throw new IllegalArgumentException(
                                String.format("Buồng khám [%s] đã được Bác sĩ %s đăng ký trực trong khung giờ (%s - %s) ngày %s. " +
                                              "Vui lòng chọn buồng khám khác (P.101, P.205, P.208, P.209...) hoặc chọn khung giờ khác!",
                                              targetRoom, otherDoctorName, ex.getStartTime(), ex.getEndTime(), request.workDate())
                            );
                        }
                    }
                }
            }
        }

        // Cập nhật lại buồng khám chuyên môn của bác sĩ nếu có thay đổi và đã vượt qua toàn bộ kiểm tra hợp lệ
        if (request.roomNumber() != null && !request.roomNumber().isBlank()
                && !targetRoom.equalsIgnoreCase(currentDoctor.getRoomNumber())) {
            currentDoctor.setRoomNumber(targetRoom);
            currentDoctor.setUpdatedAt(Instant.now());
            doctorRepository.save(currentDoctor);
        }

        Instant now = Instant.now();
        String scheduleId = UUID.randomUUID().toString();
        DoctorScheduleEntity schedule = new DoctorScheduleEntity(
                scheduleId,
                targetDoctorId,
                request.workDate(),
                request.startTime(),
                request.endTime(),
                duration,
                ScheduleStatus.ACTIVE,
                now,
                now
        );
        schedule = doctorScheduleRepository.save(schedule);
        if (devMode247) {
            schedule.setDevSessionId(currentDevSessionId);
            schedule.setTestData(true);
            schedule = doctorScheduleRepository.save(schedule);
            devModeScheduleIds.add(schedule.getId());
        }

        // Sinh các slot 30 phút tự động (bỏ qua khung giờ nghỉ trưa 12:00 - 13:30 nếu ca trực bao trọn buổi trưa)
        LocalTime cursor = request.startTime();
        List<TimeSlotEntity> createdSlots = new ArrayList<>();
        while (cursor.isBefore(request.endTime())) {
            LocalTime next = cursor.plusMinutes(duration);
            if (!next.isAfter(cursor) || next.isAfter(request.endTime())) {
                break;
            }
            boolean isLunch = !cursor.isBefore(LocalTime.of(12, 0)) && cursor.isBefore(LocalTime.of(13, 30));

            if (!isLunch) {
                Instant slotStart = request.workDate().atTime(cursor).atZone(VN_ZONE).toInstant();
                Instant slotEnd = request.workDate().atTime(next).atZone(VN_ZONE).toInstant();

                if (slotEnd.isAfter(now) || isAdmin || devMode247) {
                    TimeSlotEntity slot = new TimeSlotEntity(
                            UUID.randomUUID().toString(),
                            schedule.getId(),
                            targetDoctorId,
                            slotStart,
                            slotEnd,
                            SlotStatus.AVAILABLE,
                            now,
                            now
                    );
                    createdSlots.add(slot);
                }
            }
            cursor = next;
        }

        if (createdSlots.isEmpty()) {
            doctorScheduleRepository.delete(schedule);
            throw new IllegalArgumentException("Không thể tạo ca trực vì tất cả các khung giờ khám (slots) đều đã trôi qua trong quá khứ.");
        }

        timeSlotRepository.saveAll(createdSlots);
        return mapToDto(schedule, createdSlots);
    }

    @Transactional
    public DoctorScheduleDtos.TimeSlotDto toggleSlotStatus(String slotId) {
        TimeSlotEntity slot = timeSlotRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khung giờ khám: " + slotId));

        if (slot.getStatus() == SlotStatus.BOOKED) {
            throw new IllegalArgumentException("Không thể khóa hoặc thay đổi khung giờ đã có bệnh nhân đặt lịch hẹn.");
        }

        if (slot.getStartTime().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Khung giờ này đã trôi qua trong quá khứ, không thể thay đổi trạng thái.");
        }

        if (slot.getStatus() == SlotStatus.AVAILABLE) {
            slot.setStatus(SlotStatus.LOCKED);
        } else {
            slot.setStatus(SlotStatus.AVAILABLE);
        }
        slot.setUpdatedAt(Instant.now());
        slot = timeSlotRepository.save(slot);

        return new DoctorScheduleDtos.TimeSlotDto(
                slot.getId(),
                slot.getScheduleId(),
                slot.getDoctorId(),
                TIME_FORMATTER.format(slot.getStartTime()),
                TIME_FORMATTER.format(slot.getEndTime()),
                slot.getStatus().name()
        );
    }

    @Transactional
    public void deleteSchedule(String userId, String scheduleId) {
        DoctorScheduleEntity schedule = doctorScheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ca trực: " + scheduleId));

        if (userId != null && !userId.isBlank()) {
            String targetDoctorId = resolveDoctorId(userId, null);
            if (!schedule.getDoctorId().equals(targetDoctorId)) {
                throw new IllegalArgumentException("Bác sĩ không có quyền xóa ca trực của bác sĩ khác.");
            }
        }

        LocalDate today = LocalDate.now(VN_ZONE);
        if (schedule.getWorkDate().isBefore(today)) {
            throw new IllegalArgumentException("Không thể xóa ca trực đã kết thúc trong quá khứ.");
        }

        List<TimeSlotEntity> slots = timeSlotRepository.findByScheduleIdOrderByStartTimeAsc(scheduleId);
        long bookedCount = slots.stream().filter(s -> s.getStatus() == SlotStatus.BOOKED).count();
        if (bookedCount > 0) {
            throw new IllegalArgumentException("Ca trực này hiện có " + bookedCount + " bệnh nhân đã đặt lịch. Vui lòng sử dụng tính năng 'Hủy Ca Khẩn Cấp' (Bất Khả Kháng) và nhập lý do để hệ thống ghi nhận và điều phối người bệnh.");
        }

        timeSlotRepository.deleteAll(slots);
        doctorScheduleRepository.delete(schedule);
    }

    @Transactional
    public void deleteSchedule(String scheduleId) {
        deleteSchedule(null, scheduleId);
    }

    /**
     * CLAB-113: Bác sĩ đổi buồng khám phân công cho ca trực.
     * QUY TẮC PHÒNG KHÁM: Bác sĩ CHỈ ĐƯỢC ĐỔI BUỒNG KHÁM TRƯỚC TỐI THIỂU 1 NGÀY (trước 00:00:00).
     * Khi bước sang ngày khám mới (hôm nay hoặc quá khứ), buồng khám bị KHÓA CỐ ĐỊNH nhằm đồng bộ
     * tuyệt đối với phiếu số thứ tự tiếp đón và màn hình gọi số LCD ngoài sảnh chờ của người bệnh.
     */
    @Transactional
    public DoctorScheduleDtos.DoctorScheduleDto changeScheduleRoom(String userId, String scheduleId, DoctorScheduleDtos.ChangeScheduleRoomRequest request) {
        DoctorScheduleEntity schedule = doctorScheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ca trực: " + scheduleId));

        boolean isAdmin = isCallerAdmin(userId);
        LocalDate today = LocalDate.now(VN_ZONE);

        // CLAB-113: Bác sĩ chỉ được đổi buồng khám trước tối thiểu 1 ngày (trước 00:00:00).
        // Trường hợp khẩn cấp trong ngày (hỏng thiết bị, bảo trì phòng): Quản Trị Viên (Admin) có thẩm quyền ghi đè đổi buồng ngay trong ngày.
        if (!isAdmin) {
            if (!schedule.getWorkDate().isAfter(today)) {
                throw new IllegalArgumentException(
                        String.format("Theo quy định phòng khám, Bác sĩ chỉ được đổi buồng khám trước tối thiểu 1 ngày (trước 00:00:00). " +
                                      "Khi bước sang ngày khám mới (ngày: %s), buồng khám đã được chốt và đồng bộ với phiếu hẹn/màn hình gọi số của người bệnh. " +
                                      "Trong trường hợp khẩn cấp, vui lòng liên hệ Quản Trị Viên (Admin) để điều phối buồng khám!",
                                      schedule.getWorkDate())
                );
            }

            String targetDoctorId = resolveDoctorId(userId, null);
            if (!schedule.getDoctorId().equals(targetDoctorId)) {
                throw new IllegalArgumentException("Bác sĩ không có quyền thay đổi buồng khám của ca trực này.");
            }
        }

        String targetRoom = (request.newRoomNumber() != null && !request.newRoomNumber().isBlank())
                ? request.newRoomNumber().trim().toUpperCase()
                : "";

        if (!isValidClinicRoom(targetRoom) && !isAdmin) {
            throw new IllegalArgumentException("Buồng khám [" + targetRoom
                    + "] không hợp lệ hoặc chưa được Quản Trị Viên (Admin) phê duyệt. Vui lòng chỉ chọn các buồng khám hợp lệ: "
                    + String.join(", ", APPROVED_CLINIC_ROOMS));
        }

        // Kiểm tra xung đột buồng khám với Bác sĩ khác trong cùng ngày/khung giờ
        List<DoctorScheduleEntity> allSchedulesOnDate = doctorScheduleRepository.findByWorkDate(schedule.getWorkDate());
        for (DoctorScheduleEntity ex : allSchedulesOnDate) {
            if (ex.getStatus() == ScheduleStatus.ACTIVE && !ex.getDoctorId().equals(schedule.getDoctorId())) {
                DoctorEntity otherDoctor = doctorRepository.findById(ex.getDoctorId()).orElse(null);
                if (otherDoctor != null) {
                    DoctorEntity curDoctor = doctorRepository.findById(schedule.getDoctorId()).orElse(null);
                    if (!isSameBranch(curDoctor, otherDoctor)) {
                        // Khác chi nhánh -> buồng khám vật lý không xung đột
                        continue;
                    }
                    String otherRoom = otherDoctor.getRoomNumber() != null ? otherDoctor.getRoomNumber().trim().toUpperCase() : "";
                    if (targetRoom.equalsIgnoreCase(otherRoom)) {
                        boolean overlap = schedule.getStartTime().isBefore(ex.getEndTime()) && schedule.getEndTime().isAfter(ex.getStartTime());
                        if (overlap) {
                            String otherDoctorName = userJpaRepository.findById(otherDoctor.getUserId())
                                    .map(UserEntity::getFullName)
                                    .orElse("Bác sĩ khác");
                            if (otherDoctor.getAcademicTitle() != null && !otherDoctor.getAcademicTitle().isBlank()) {
                                otherDoctorName = otherDoctor.getAcademicTitle() + " " + otherDoctorName;
                            }
                            throw new IllegalArgumentException(
                                    String.format("Buồng khám [%s] đã được Bác sĩ %s đăng ký trực trong khung giờ (%s - %s) ngày %s. " +
                                                  "Vui lòng chọn buồng khám khác hoặc khung giờ khác!",
                                                  targetRoom, otherDoctorName, ex.getStartTime(), ex.getEndTime(), schedule.getWorkDate())
                            );
                        }
                    }
                }
            }
        }

        DoctorEntity currentDoctor = doctorRepository.findById(schedule.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin Bác sĩ trong hệ thống."));
        currentDoctor.setRoomNumber(targetRoom);
        currentDoctor.setUpdatedAt(Instant.now());
        doctorRepository.save(currentDoctor);

        return mapToDto(schedule);
    }

    /**
     * Tra cứu danh sách bệnh nhân bị ảnh hưởng trước khi Bác sĩ xác nhận hủy ca khẩn cấp.
     */
    @Transactional(readOnly = true)
    public List<DoctorScheduleDtos.AffectedPatientInfoDto> getScheduleAffectedPatients(String scheduleId) {
        DoctorScheduleEntity schedule = doctorScheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ca trực: " + scheduleId));

        List<TimeSlotEntity> slots = timeSlotRepository.findByScheduleIdOrderByStartTimeAsc(scheduleId);
        List<String> slotIds = slots.stream().map(TimeSlotEntity::getId).toList();

        if (slotIds.isEmpty() || appointmentJpaRepository == null) {
            return List.of();
        }

        List<AppointmentEntity> appointments = appointmentJpaRepository.findBySlotIdIn(slotIds);
        List<DoctorScheduleDtos.AffectedPatientInfoDto> result = new ArrayList<>();

        for (AppointmentEntity appt : appointments) {
            if (appt.getStatus() == AppointmentStatus.CANCELLED) continue;

            PatientProfileEntity profile = patientProfileJpaRepository != null
                    ? patientProfileJpaRepository.findById(appt.getPatientProfileId()).orElse(null)
                    : null;
            String patientName = profile != null ? profile.getFullName() : "Bệnh nhân";
            String phone = profile != null && profile.getPhone() != null ? profile.getPhone() : "---";

            TimeSlotEntity slot = slots.stream()
                    .filter(s -> s.getId().equals(appt.getSlotId()))
                    .findFirst().orElse(null);
            String slotTime = slot != null
                    ? TIME_FORMATTER.format(slot.getStartTime()) + " - " + TIME_FORMATTER.format(slot.getEndTime())
                    : "---";

            result.add(new DoctorScheduleDtos.AffectedPatientInfoDto(
                    appt.getId(),
                    appt.getBookingCode(),
                    patientName,
                    phone,
                    slotTime,
                    appt.getStatus().name(),
                    null
            ));
        }

        return result;
    }

    /**
     * PHƯƠNG ÁN 2: Bác sĩ hủy ca trực khẩn cấp khi đã có bệnh nhân đặt lịch (Lý do bất khả kháng).
     * Bắt buộc có lý do hủy, ghi nhận vào hồ sơ ca khám và tự động điều phối sang bác sĩ cùng chuyên khoa (nếu có).
     */
    @Transactional
    public DoctorScheduleDtos.EmergencyCancelResponse emergencyCancelSchedule(
            String userId,
            String scheduleId,
            DoctorScheduleDtos.EmergencyCancelScheduleRequest request
    ) {
        DoctorScheduleEntity schedule = doctorScheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ca trực: " + scheduleId));

        // Kiểm tra quyền: Bác sĩ sở hữu ca trực
        if (userId != null && !userId.isBlank()) {
            List<DoctorEntity> userDocs = doctorRepository.findByUserId(userId);
            if (!userDocs.isEmpty()) {
                DoctorEntity userDoc = userDocs.get(0);
                if (!userDoc.getId().equals(schedule.getDoctorId())) {
                    throw new AccessDeniedException("Bạn không có quyền hủy ca trực của Bác sĩ khác.");
                }
            }
        }

        List<TimeSlotEntity> slots = timeSlotRepository.findByScheduleIdOrderByStartTimeAsc(scheduleId);
        List<String> slotIds = slots.stream().map(TimeSlotEntity::getId).toList();

        List<AppointmentEntity> affectedAppointments = (appointmentJpaRepository != null && !slotIds.isEmpty())
                ? appointmentJpaRepository.findBySlotIdIn(slotIds)
                : List.of();

        List<DoctorScheduleDtos.AffectedPatientInfoDto> affectedPatientDtos = new ArrayList<>();
        int reassignedCount = 0;

        DoctorEntity currentDoctor = doctorRepository.findById(schedule.getDoctorId()).orElse(null);
        String doctorName = "Bác sĩ phụ trách";
        if (currentDoctor != null) {
            String title = currentDoctor.getAcademicTitle() != null ? currentDoctor.getAcademicTitle() + " " : "";
            String rawName = userJpaRepository.findById(currentDoctor.getUserId()).map(UserEntity::getFullName).orElse("Bác sĩ");
            doctorName = title + rawName;
        }

        Instant now = Instant.now();

        for (AppointmentEntity appt : affectedAppointments) {
            if (appt.getStatus() == AppointmentStatus.CANCELLED) continue;

            PatientProfileEntity profile = patientProfileJpaRepository != null
                    ? patientProfileJpaRepository.findById(appt.getPatientProfileId()).orElse(null)
                    : null;
            String patientName = profile != null ? profile.getFullName() : "Bệnh nhân";
            String phone = profile != null && profile.getPhone() != null ? profile.getPhone() : "---";

            TimeSlotEntity originalSlot = slots.stream()
                    .filter(s -> s.getId().equals(appt.getSlotId()))
                    .findFirst().orElse(null);
            String slotTime = originalSlot != null
                    ? TIME_FORMATTER.format(originalSlot.getStartTime()) + " - " + TIME_FORMATTER.format(originalSlot.getEndTime())
                    : "---";

            String reassignedDoctorName = null;
            boolean reassigned = false;

            // Nếu người dùng chọn tự động điều chuyển sang bác sĩ cùng chuyên khoa
            if (request.autoReassign() && currentDoctor != null && currentDoctor.getSpecialtyId() != null && originalSlot != null) {
                List<DoctorEntity> peers = doctorRepository.findBySpecialtyId(currentDoctor.getSpecialtyId()).stream()
                        .filter(d -> !d.getId().equals(currentDoctor.getId()))
                        .toList();

                for (DoctorEntity peer : peers) {
                    List<TimeSlotEntity> peerSlots = timeSlotRepository.findByDoctorIdAndStartTimeBetweenOrderByStartTimeAsc(
                            peer.getId(), originalSlot.getStartTime(), originalSlot.getEndTime()
                    );
                    Optional<TimeSlotEntity> availablePeerSlot = peerSlots.stream()
                            .filter(s -> s.getStatus() == SlotStatus.AVAILABLE)
                            .findFirst();

                    if (availablePeerSlot.isPresent()) {
                        TimeSlotEntity newSlot = availablePeerSlot.get();
                        newSlot.setStatus(SlotStatus.BOOKED);
                        newSlot.setUpdatedAt(now);
                        timeSlotRepository.save(newSlot);

                        String peerTitle = peer.getAcademicTitle() != null ? peer.getAcademicTitle() + " " : "";
                        String peerRawName = userJpaRepository.findById(peer.getUserId()).map(UserEntity::getFullName).orElse("Bác sĩ");
                        reassignedDoctorName = peerTitle + peerRawName;

                        appt.setDoctorId(peer.getId());
                        appt.setSlotId(newSlot.getId());
                        appt.setUpdatedAt(now);
                        String currentSymptoms = appt.getPatientSymptoms() != null ? appt.getPatientSymptoms() + "\n" : "";
                        appt.setPatientSymptoms(currentSymptoms + "[ĐIỀU PHỐI TỰ ĐỘNG]: Bác sĩ " + doctorName
                                + " hủy ca trực khẩn cấp (" + request.reason() + "), hệ thống đã điều chuyển sang Bác sĩ "
                                + reassignedDoctorName + " (" + (peer.getRoomNumber() != null ? peer.getRoomNumber() : "Phòng khám") + ").");
                        appointmentJpaRepository.save(appt);

                        reassigned = true;
                        reassignedCount++;
                        break;
                    }
                }
            }

            if (!reassigned) {
                appt.setStatus(AppointmentStatus.CANCELLED);
                appt.setUpdatedAt(now);
                String currentSymptoms = appt.getPatientSymptoms() != null ? appt.getPatientSymptoms() + "\n" : "";
                appt.setPatientSymptoms(currentSymptoms + "[BÁC SĨ HỦY CA KHẨN CẤP]: Lý do: " + request.reason()
                        + " | Cần Lễ tân liên hệ người bệnh để dời ngày hoặc đổi bác sĩ.");
                appointmentJpaRepository.save(appt);
            }

            affectedPatientDtos.add(new DoctorScheduleDtos.AffectedPatientInfoDto(
                    appt.getId(),
                    appt.getBookingCode(),
                    patientName,
                    phone,
                    slotTime,
                    reassigned ? "ĐÃ ĐIỀU PHUYỂN" : "CẦN LỄ TÂN HỖ TRỢ",
                    reassignedDoctorName
            ));
        }

        // Xóa các slot và ca trực
        timeSlotRepository.deleteAll(slots);
        doctorScheduleRepository.delete(schedule);

        String message = String.format(
                "Đã hủy ca trực ngày %s thành công. Lý do: '%s'. Tổng %d bệnh nhân bị ảnh hưởng (%d ca đã tự động điều phối sang Bác sĩ cùng chuyên khoa, %d ca chuyển sang danh sách hỗ trợ của Lễ tân).",
                schedule.getWorkDate(),
                request.reason(),
                affectedPatientDtos.size(),
                reassignedCount,
                affectedPatientDtos.size() - reassignedCount
        );

        return new DoctorScheduleDtos.EmergencyCancelResponse(
                scheduleId,
                schedule.getWorkDate().toString(),
                affectedPatientDtos.size(),
                reassignedCount,
                affectedPatientDtos,
                message
        );
    }

    /**
     * Tự động sinh lịch trực mặc định cho ngày mục tiêu (Áp dụng cho Cron Job 17:00).
     * Bỏ qua các bác sĩ đã chủ động đăng ký trước 17:00.
     */
    @Transactional
    public DoctorScheduleDtos.AutoScheduleResultDto autoGenerateScheduleForTargetDate(LocalDate targetDate) {
        if (!autoScheduleEnabled) {
            return new DoctorScheduleDtos.AutoScheduleResultDto(
                    targetDate,
                    0, 0, 0,
                    "Chế độ Bác Sĩ Tự Đặt Lịch Thủ Công đang BẬT (Tính năng tự động sinh lịch toàn viện đang TẮT)."
            );
        }

        DayOfWeek dow = targetDate.getDayOfWeek();
        if (dow == DayOfWeek.SUNDAY) {
            return new DoctorScheduleDtos.AutoScheduleResultDto(
                    targetDate,
                    0, 0, 0,
                    "Ngày " + targetDate + " là Chủ Nhật, phòng khám nghỉ theo quy định."
            );
        }

        List<DoctorEntity> doctors = doctorRepository.findAll();
        int doctorsCount = 0;
        int shiftsCount = 0;
        int slotsCount = 0;
        Set<String> processedUserIds = new HashSet<>();

        for (DoctorEntity doc : doctors) {
            if (doc.getUserId() != null && processedUserIds.contains(doc.getUserId())) {
                continue;
            }

            List<DoctorScheduleEntity> existing = doctorScheduleRepository.findByDoctorIdAndWorkDate(doc.getId(), targetDate);
            if (!existing.isEmpty()) {
                if (doc.getUserId() != null) {
                    processedUserIds.add(doc.getUserId());
                }
                // Nếu ca trực đã tồn tại nhưng chưa có slots, tự động sinh bù slots ngay lập tức
                for (DoctorScheduleEntity ex : existing) {
                    generateSlotsForSchedule(ex);
                }
                continue;
            }

            // Nếu bác sĩ có hồ sơ ở chi nhánh khác và chi nhánh kia đã có lịch trong targetDate -> bỏ qua
            if (doc.getUserId() != null) {
                List<DoctorEntity> userDocs = doctorRepository.findByUserId(doc.getUserId());
                List<String> docIds = userDocs.stream().map(DoctorEntity::getId).toList();
                List<DoctorScheduleEntity> otherSchedules = doctorScheduleRepository.findByDoctorIdInAndWorkDateBetween(
                        docIds, targetDate, targetDate
                );
                if (!otherSchedules.isEmpty()) {
                    processedUserIds.add(doc.getUserId());
                    continue;
                }
            }

            ensureDefaultTodaySchedule(doc.getId(), targetDate);
            if (doc.getUserId() != null) {
                processedUserIds.add(doc.getUserId());
            }
            doctorsCount++;
            shiftsCount += 2;
            slotsCount += 15; // 8 ca sáng + 7 ca chiều
        }

        String message = String.format(
                "Tự động xếp lịch trực ngày %s thành công: %d Bác sĩ được mở lịch (%d ca trực, khoảng %d khung giờ khám).",
                targetDate, doctorsCount, shiftsCount, slotsCount
        );

        return new DoctorScheduleDtos.AutoScheduleResultDto(
                targetDate,
                doctorsCount,
                shiftsCount,
                slotsCount,
                message
        );
    }

    /**
     * Tự động sinh lịch trực cho toàn bộ Bác sĩ trong vòng 7 ngày (1 tuần) tới.
     * Áp dụng cơ chế cuốn chiếu (Rolling 7 days), tự động sinh đầy đủ ca trực cho toàn bộ các ngày làm việc.
     */
    @Transactional
    public DoctorScheduleDtos.AutoScheduleResultDto autoGenerateScheduleForNextNDays(int daysAhead) {
        if (!autoScheduleEnabled) {
            return new DoctorScheduleDtos.AutoScheduleResultDto(
                    LocalDate.now(VN_ZONE),
                    0, 0, 0,
                    "Chế độ Bác Sĩ Tự Đặt Lịch Thủ Công đang BẬT (Tính năng tự động sinh lịch toàn viện đang TẮT)."
            );
        }

        LocalDate today = LocalDate.now(VN_ZONE);
        int totalDoctors = 0;
        int totalShifts = 0;
        int totalSlots = 0;
        int scheduledDaysCount = 0;

        for (int i = 0; i < daysAhead; i++) {
            LocalDate date = today.plusDays(i);
            DayOfWeek dow = date.getDayOfWeek();
            if (dow == DayOfWeek.SUNDAY) {
                // Nghỉ chủ nhật theo quy định phòng khám
                continue;
            }

            DoctorScheduleDtos.AutoScheduleResultDto dayResult = autoGenerateScheduleForTargetDate(date);
            totalDoctors = Math.max(totalDoctors, dayResult.doctorsScheduledCount());
            totalShifts += dayResult.totalShiftsCreated();
            totalSlots += dayResult.totalSlotsCreated();
            scheduledDaysCount++;
        }

        String message = String.format(
                "Đã tự động rà soát & đảm bảo lịch trực 1 tuần tới (%d ngày làm việc) cho toàn bộ Bác sĩ: Đã tạo %d ca trực và %d khung giờ khám.",
                scheduledDaysCount, totalShifts, totalSlots
        );

        return new DoctorScheduleDtos.AutoScheduleResultDto(
                today,
                totalDoctors,
                totalShifts,
                totalSlots,
                message
        );
    }

    private DoctorScheduleDtos.DoctorScheduleDto mapToDto(DoctorScheduleEntity schedule) {
        return mapToDto(schedule, null);
    }

    private DoctorScheduleDtos.DoctorScheduleDto mapToDto(DoctorScheduleEntity schedule, List<TimeSlotEntity> preloadedSlots) {
        List<TimeSlotEntity> slots;
        if (preloadedSlots != null) {
            slots = preloadedSlots;
        } else {
            slots = timeSlotRepository.findByScheduleIdOrderByStartTimeAsc(schedule.getId());
            if (slots.isEmpty() && schedule.getStatus() == ScheduleStatus.ACTIVE) {
                slots = generateSlotsForSchedule(schedule);
            }
        }
        int total = slots.size();
        int available = (int) slots.stream().filter(s -> s.getStatus() == SlotStatus.AVAILABLE).count();
        int booked = (int) slots.stream().filter(s -> s.getStatus() == SlotStatus.BOOKED).count();

        List<DoctorScheduleDtos.TimeSlotDto> slotDtos = slots.stream().map(s -> new DoctorScheduleDtos.TimeSlotDto(
                s.getId(),
                s.getScheduleId(),
                s.getDoctorId(),
                TIME_FORMATTER.format(s.getStartTime()),
                TIME_FORMATTER.format(s.getEndTime()),
                s.getStatus().name()
        )).toList();

        DoctorEntity doc = doctorRepository.findById(schedule.getDoctorId()).orElse(null);
        String room = (doc != null && doc.getRoomNumber() != null && !doc.getRoomNumber().isBlank())
                ? doc.getRoomNumber().trim().toUpperCase()
                : null;

        String doctorName = "Bác sĩ chuyên khoa";
        String academicTitle = null;
        String specialtyName = "Đa khoa";
        String medicalCenterName = "Hệ thống MedSched";

        if (doc != null) {
            academicTitle = doc.getAcademicTitle();
            if (doc.getUserId() != null) {
                UserEntity u = userJpaRepository.findById(doc.getUserId()).orElse(null);
                if (u != null) {
                    doctorName = u.getFullName();
                    if (academicTitle != null && !academicTitle.isBlank()) {
                        String cleanTitle = academicTitle.trim();
                        if (!doctorName.toLowerCase().startsWith(cleanTitle.toLowerCase())) {
                            doctorName = cleanTitle + " " + doctorName;
                        }
                    }
                    if (userMedicalCenterRoleJpaRepository != null && medicalCenterJpaRepository != null) {
                        var roleList = userMedicalCenterRoleJpaRepository.findByUserIdAndActiveTrue(u.getId());
                        if (!roleList.isEmpty()) {
                            var center = medicalCenterJpaRepository.findById(roleList.get(0).getMedicalCenterId()).orElse(null);
                            if (center != null) {
                                medicalCenterName = center.getName();
                            }
                        }
                    }
                }
            }
            if (doc.getSpecialtyId() != null && specialtyJpaRepository != null) {
                var spec = specialtyJpaRepository.findById(doc.getSpecialtyId()).orElse(null);
                if (spec != null) {
                    specialtyName = spec.getName();
                }
            }
        }

        return new DoctorScheduleDtos.DoctorScheduleDto(
                schedule.getId(),
                schedule.getDoctorId(),
                schedule.getWorkDate(),
                schedule.getStartTime() != null ? schedule.getStartTime().toString().substring(0, 5) : "",
                schedule.getEndTime() != null ? schedule.getEndTime().toString().substring(0, 5) : "",
                schedule.getSlotDurationMinutes() != null ? schedule.getSlotDurationMinutes() : 30,
                schedule.getStatus().name(),
                total,
                available,
                booked,
                slotDtos,
                room,
                doctorName,
                academicTitle,
                specialtyName,
                medicalCenterName
        );
    }

    private List<TimeSlotEntity> generateSlotsForSchedule(DoctorScheduleEntity schedule) {
        List<TimeSlotEntity> existing = timeSlotRepository.findByScheduleIdOrderByStartTimeAsc(schedule.getId());
        if (!existing.isEmpty()) {
            return existing;
        }

        Instant now = Instant.now();
        int duration = (schedule.getSlotDurationMinutes() != null && schedule.getSlotDurationMinutes() > 0)
                ? schedule.getSlotDurationMinutes()
                : 30;

        LocalTime start = schedule.getStartTime();
        LocalTime end = schedule.getEndTime();
        LocalDate workDate = schedule.getWorkDate();

        List<TimeSlotEntity> createdSlots = new ArrayList<>();

        // Nếu ca kéo dài qua giờ trưa (ví dụ 08:00 - 17:00), chia thành ca sáng và chiều (nghỉ trưa 12:00 - 13:30)
        if (start.isBefore(LocalTime.of(12, 0)) && end.isAfter(LocalTime.of(13, 0))) {
            // Ca sáng
            LocalTime cursor = start;
            LocalTime morningEnd = LocalTime.of(12, 0);
            while (cursor.isBefore(morningEnd)) {
                LocalTime next = cursor.plusMinutes(duration);
                if (!next.isAfter(cursor) || next.isAfter(morningEnd)) {
                    break;
                }
                Instant slotStart = workDate.atTime(cursor).atZone(VN_ZONE).toInstant();
                Instant slotEnd = workDate.atTime(next).atZone(VN_ZONE).toInstant();
                createdSlots.add(new TimeSlotEntity(
                        UUID.randomUUID().toString(),
                        schedule.getId(),
                        schedule.getDoctorId(),
                        slotStart,
                        slotEnd,
                        SlotStatus.AVAILABLE,
                        now,
                        now
                ));
                cursor = next;
            }

            // Ca chiều
            cursor = LocalTime.of(13, 30);
            while (cursor.isBefore(end)) {
                LocalTime next = cursor.plusMinutes(duration);
                if (!next.isAfter(cursor) || next.isAfter(end)) {
                    break;
                }
                Instant slotStart = workDate.atTime(cursor).atZone(VN_ZONE).toInstant();
                Instant slotEnd = workDate.atTime(next).atZone(VN_ZONE).toInstant();
                createdSlots.add(new TimeSlotEntity(
                        UUID.randomUUID().toString(),
                        schedule.getId(),
                        schedule.getDoctorId(),
                        slotStart,
                        slotEnd,
                        SlotStatus.AVAILABLE,
                        now,
                        now
                ));
                cursor = next;
            }
        } else {
            // Ca bình thường
            LocalTime cursor = start;
            while (cursor.isBefore(end)) {
                LocalTime next = cursor.plusMinutes(duration);
                if (!next.isAfter(cursor) || next.isAfter(end)) {
                    break;
                }
                Instant slotStart = workDate.atTime(cursor).atZone(VN_ZONE).toInstant();
                Instant slotEnd = workDate.atTime(next).atZone(VN_ZONE).toInstant();
                createdSlots.add(new TimeSlotEntity(
                        UUID.randomUUID().toString(),
                        schedule.getId(),
                        schedule.getDoctorId(),
                        slotStart,
                        slotEnd,
                        SlotStatus.AVAILABLE,
                        now,
                        now
                ));
                cursor = next;
            }
        }

        if (!createdSlots.isEmpty()) {
            timeSlotRepository.saveAll(createdSlots);
        }
        return createdSlots;
    }

    /**
     * Truy vấn danh sách các buồng khám đã có Bác sĩ khác đăng ký trực trong ngày/khung giờ
     * để Frontend làm mờ hoặc cảnh báo ngay lập tức khi Bác sĩ chọn phòng.
     */
    @Transactional(readOnly = true)
    public List<DoctorScheduleDtos.RoomOccupancyDto> getRoomOccupancy(String userId, LocalDate workDate, LocalTime startTime, LocalTime endTime) {
        String currentDoctorId = null;
        try {
            currentDoctorId = resolveDoctorId(userId, null);
        } catch (Exception ignored) {}

        List<DoctorScheduleEntity> schedules = doctorScheduleRepository.findByWorkDate(workDate);
        List<DoctorScheduleDtos.RoomOccupancyDto> result = new ArrayList<>();

        for (DoctorScheduleEntity ex : schedules) {
            if (ex.getStatus() != ScheduleStatus.ACTIVE) continue;
            if (currentDoctorId != null && currentDoctorId.equals(ex.getDoctorId())) continue;

            boolean overlap = true;
            if (startTime != null && endTime != null) {
                overlap = startTime.isBefore(ex.getEndTime()) && endTime.isAfter(ex.getStartTime());
            }

            if (overlap) {
                DoctorEntity doc = doctorRepository.findById(ex.getDoctorId()).orElse(null);
                if (doc != null && doc.getRoomNumber() != null && !doc.getRoomNumber().isBlank()) {
                    String docName = userJpaRepository.findById(doc.getUserId())
                            .map(UserEntity::getFullName)
                            .orElse("Bác sĩ trực");
                    if (doc.getAcademicTitle() != null && !doc.getAcademicTitle().isBlank()) {
                        docName = doc.getAcademicTitle() + " " + docName;
                    }

                    result.add(new DoctorScheduleDtos.RoomOccupancyDto(
                            doc.getRoomNumber().trim().toUpperCase(),
                            doc.getId(),
                            docName,
                            ex.getStartTime() != null ? ex.getStartTime().toString().substring(0, 5) : "",
                            ex.getEndTime() != null ? ex.getEndTime().toString().substring(0, 5) : "",
                            true
                    ));
                }
            }
        }

        return result;
    }
}
