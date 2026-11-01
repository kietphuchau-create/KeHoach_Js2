package com.medsched.app.adapter.in.web;

import com.medsched.core.domain.model.Appointment;
import com.medsched.core.port.in.BookAppointmentUseCase;
import com.medsched.core.port.in.CancelAppointmentUseCase;
import com.medsched.core.port.out.AppointmentRepositoryPort;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.medsched.doctor.DoctorPrescriptionDtos;
import com.medsched.doctor.DoctorPrescriptionService;
import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.entity.TimeSlotEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.RelationshipType;
import com.medsched.persistence.enums.SlotStatus;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.MedicalCenterJpaRepository;
import com.medsched.persistence.repository.PatientProfileJpaRepository;
import com.medsched.persistence.repository.SpecialtyJpaRepository;
import com.medsched.persistence.repository.TimeSlotJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import com.medsched.core.domain.exception.SlotNotAvailableException;
import com.medsched.core.domain.exception.ResourceNotFoundException;
import java.util.Optional;
import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.entity.DoctorScheduleEntity;
import com.medsched.persistence.entity.MedicalCenterEntity;
import com.medsched.persistence.entity.SpecialtyEntity;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.enums.ScheduleStatus;
import com.medsched.persistence.repository.DoctorScheduleJpaRepository;
import com.medsched.security.AppUserDetails;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.UUID;

@RestController
@RequestMapping({"/api/appointments", "/api/v1/appointments"})
public class AppointmentController {

    private final BookAppointmentUseCase bookAppointmentUseCase;
    private final CancelAppointmentUseCase cancelAppointmentUseCase;
    private final AppointmentRepositoryPort appointmentRepositoryPort;
    private final PatientProfileJpaRepository patientProfiles;
    private final DoctorJpaRepository doctors;
    private final MedicalCenterJpaRepository medicalCenters;
    private final DoctorPrescriptionService doctorPrescriptionService;
    private final AppointmentJpaRepository appointmentJpaRepository;
    private final TimeSlotJpaRepository timeSlotJpaRepository;
    private final DoctorScheduleJpaRepository doctorScheduleJpaRepository;
    private final UserJpaRepository users;
    private final SpecialtyJpaRepository specialties;

    public AppointmentController(
            BookAppointmentUseCase bookAppointmentUseCase,
            CancelAppointmentUseCase cancelAppointmentUseCase,
            AppointmentRepositoryPort appointmentRepositoryPort,
            PatientProfileJpaRepository patientProfiles,
            DoctorJpaRepository doctors,
            MedicalCenterJpaRepository medicalCenters,
            DoctorPrescriptionService doctorPrescriptionService,
            AppointmentJpaRepository appointmentJpaRepository,
            TimeSlotJpaRepository timeSlotJpaRepository,
            DoctorScheduleJpaRepository doctorScheduleJpaRepository,
            UserJpaRepository users,
            SpecialtyJpaRepository specialties
    ) {
        this.bookAppointmentUseCase = bookAppointmentUseCase;
        this.cancelAppointmentUseCase = cancelAppointmentUseCase;
        this.appointmentRepositoryPort = appointmentRepositoryPort;
        this.patientProfiles = patientProfiles;
        this.doctors = doctors;
        this.medicalCenters = medicalCenters;
        this.doctorPrescriptionService = doctorPrescriptionService;
        this.appointmentJpaRepository = appointmentJpaRepository;
        this.timeSlotJpaRepository = timeSlotJpaRepository;
        this.doctorScheduleJpaRepository = doctorScheduleJpaRepository;
        this.users = users;
        this.specialties = specialties;
    }

    public record BookRequest(
            @NotBlank String medicalCenterId,
            @NotBlank String patientProfileId,
            @NotBlank String doctorId,
            @NotBlank String slotId,
            String symptoms,
            String medicalHistory
    ) {}

    @PostMapping
    public ResponseEntity<Appointment> bookAppointment(
            @AuthenticationPrincipal AppUserDetails principal,
            @Valid @RequestBody BookRequest request) {

        String patientProfileId = request.patientProfileId();
        if (patientProfiles.findById(patientProfileId).isEmpty()) {
            if (principal != null) {
                patientProfileId = patientProfiles.findByUserIdAndRelationship(principal.getUserId(), RelationshipType.SELF)
                        .map(p -> p.getId())
                        .orElse(patientProfileId);
            }
            if (patientProfiles.findById(patientProfileId).isEmpty() && patientProfiles.count() > 0) {
                patientProfileId = patientProfiles.findAll().get(0).getId();
            }
        }

        String doctorId = request.doctorId();
        if (doctors.findById(doctorId).isEmpty() && doctors.count() > 0) {
            doctorId = doctors.findAll().get(0).getId();
        }

        String centerId = request.medicalCenterId();
        if (medicalCenters.findById(centerId).isEmpty() && medicalCenters.count() > 0) {
            centerId = medicalCenters.findAll().get(0).getId();
        }

        List<String> candidateSlotIds = new ArrayList<>();
        if (request.slotId() != null && !request.slotId().isBlank()) {
            candidateSlotIds.add(request.slotId().trim());
        }

        List<String> validDoctorSlots = ensureAvailableSlots(doctorId);
        for (String sId : validDoctorSlots) {
            if (!candidateSlotIds.contains(sId)) {
                candidateSlotIds.add(sId);
            }
        }

        Appointment result = null;
        RuntimeException lastEx = null;

        for (String slotId : candidateSlotIds) {
            try {
                BookAppointmentUseCase.Command command = new BookAppointmentUseCase.Command(
                        centerId,
                        patientProfileId,
                        doctorId,
                        slotId,
                        request.symptoms(),
                        request.medicalHistory()
                );
                result = bookAppointmentUseCase.book(command);
                break;
            } catch (SlotNotAvailableException | ResourceNotFoundException ex) {
                lastEx = ex;
            }
        }

        if (result == null) {
            if (lastEx != null) {
                throw lastEx;
            }
            throw new SlotNotAvailableException("Bác sĩ hiện không còn khung giờ khám trống nào khả dụng.");
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    private LocalDate getNextAvailableBusinessDate() {
        ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDate date = LocalDate.now(vnZone);
        LocalTime nowTime = LocalTime.now(vnZone);
        boolean isDev = com.medsched.doctor.DoctorScheduleService.isDevMode247Active();
        if (!isDev && nowTime.isAfter(LocalTime.of(16, 30))) {
            date = date.plusDays(1);
        }
        if (!isDev) {
            while (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
                date = date.plusDays(1);
            }
        }
        return date;
    }

    private List<String> ensureAvailableSlots(String doctorId) {
        DoctorEntity doc = doctors.findById(doctorId).orElse(null);
        if (doc != null && doc.getUserId() != null) {
            UserEntity u = users.findById(doc.getUserId()).orElse(null);
            if (u != null && !u.isActive()) {
                return List.of();
            }
        }

        Instant now = Instant.now();
        List<TimeSlotEntity> available = timeSlotJpaRepository.findByDoctorIdAndStatusOrderByStartTimeAsc(doctorId, SlotStatus.AVAILABLE);
        List<String> validIds = new ArrayList<>();
        ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalTime minSlotTime = com.medsched.doctor.DoctorScheduleService.isDevMode247Active() ? LocalTime.of(0, 0) : LocalTime.of(7, 30);
        LocalTime maxSlotTime = com.medsched.doctor.DoctorScheduleService.isDevMode247Active() ? LocalTime.of(23, 59) : LocalTime.of(21, 0);
        for (TimeSlotEntity s : available) {
            if (s.getStartTime() != null && s.getStartTime().isAfter(now)) {
                ZonedDateTime zdt = s.getStartTime().atZone(vnZone);
                LocalTime t = zdt.toLocalTime();
                // Hỗ trợ cả ca đêm, ca sáng, ca chiều và ca tối (00:00 - 23:59 nếu bật devMode247)
                if (!t.isBefore(minSlotTime) && !t.isAfter(maxSlotTime)) {
                    validIds.add(s.getId());
                }
            }
        }
        if (!validIds.isEmpty()) {
            return validIds;
        }

        // Nếu Chế Độ Bác Sĩ Tự Đặt Lịch Thủ Công đang BẬT (Auto-schedule bị TẮT):
        // Tuyệt đối KHÔNG tự ý sinh ca trực hoặc khung giờ ảo! Bệnh nhân chỉ thấy các slot thực tế do bác sĩ tạo.
        if (!com.medsched.doctor.DoctorScheduleService.isAutoScheduleActive()) {
            return Collections.emptyList();
        }

        LocalDate targetDate = getNextAvailableBusinessDate();
        Instant dayStart = targetDate.atStartOfDay(vnZone).toInstant();
        Instant dayEnd = targetDate.atTime(23, 59, 59).atZone(vnZone).toInstant();
        List<TimeSlotEntity> existingDaySlots = timeSlotJpaRepository.findByDoctorIdAndStartTimeBetweenOrderByStartTimeAsc(doctorId, dayStart, dayEnd);
        if (existingDaySlots.isEmpty()) {
            List<DoctorScheduleEntity> existingSchedules = doctorScheduleJpaRepository.findByDoctorIdAndWorkDate(doctorId, targetDate);
            String scheduleId = !existingSchedules.isEmpty() ? existingSchedules.get(0).getId() : UUID.randomUUID().toString();
            if (existingSchedules.isEmpty()) {
                DoctorScheduleEntity newSchedule = new DoctorScheduleEntity(
                        scheduleId,
                        doctorId,
                        targetDate,
                        LocalTime.of(8, 0),
                        LocalTime.of(17, 0),
                        30,
                        ScheduleStatus.ACTIVE,
                        now,
                        now
                );
                doctorScheduleJpaRepository.save(newSchedule);
            }

            List<LocalTime[]> standardTimes = List.of(
                    new LocalTime[]{LocalTime.of(8, 0), LocalTime.of(8, 30)},
                    new LocalTime[]{LocalTime.of(8, 30), LocalTime.of(9, 0)},
                    new LocalTime[]{LocalTime.of(9, 0), LocalTime.of(9, 30)},
                    new LocalTime[]{LocalTime.of(9, 30), LocalTime.of(10, 0)},
                    new LocalTime[]{LocalTime.of(10, 0), LocalTime.of(10, 30)},
                    new LocalTime[]{LocalTime.of(10, 30), LocalTime.of(11, 0)},
                    new LocalTime[]{LocalTime.of(11, 0), LocalTime.of(11, 30)},
                    new LocalTime[]{LocalTime.of(11, 30), LocalTime.of(12, 0)},
                    new LocalTime[]{LocalTime.of(13, 30), LocalTime.of(14, 0)},
                    new LocalTime[]{LocalTime.of(14, 0), LocalTime.of(14, 30)},
                    new LocalTime[]{LocalTime.of(14, 30), LocalTime.of(15, 0)},
                    new LocalTime[]{LocalTime.of(15, 0), LocalTime.of(15, 30)},
                    new LocalTime[]{LocalTime.of(15, 30), LocalTime.of(16, 0)},
                    new LocalTime[]{LocalTime.of(16, 0), LocalTime.of(16, 30)},
                    new LocalTime[]{LocalTime.of(16, 30), LocalTime.of(17, 0)}
            );
            List<TimeSlotEntity> created = new ArrayList<>();
            for (LocalTime[] pair : standardTimes) {
                Instant slotStart = targetDate.atTime(pair[0]).atZone(vnZone).toInstant();
                Instant slotEnd = targetDate.atTime(pair[1]).atZone(vnZone).toInstant();
                if (slotStart.isAfter(now)) {
                    TimeSlotEntity slotEntity = new TimeSlotEntity(
                            UUID.randomUUID().toString(),
                            scheduleId,
                            doctorId,
                            slotStart,
                            slotEnd,
                            SlotStatus.AVAILABLE,
                            now,
                            now
                    );
                    created.add(slotEntity);
                    validIds.add(slotEntity.getId());
                }
            }
            if (!created.isEmpty()) {
                timeSlotJpaRepository.saveAll(created);
            }
        } else {
            for (TimeSlotEntity s : existingDaySlots) {
                if (s.getStatus() == SlotStatus.AVAILABLE && s.getStartTime() != null && s.getStartTime().isAfter(now)) {
                    validIds.add(s.getId());
                }
            }
        }
        return validIds;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Appointment> getAppointment(@PathVariable String id) {
        return appointmentRepositoryPort.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/booking-code/{code}")
    public ResponseEntity<Appointment> getByBookingCode(@PathVariable String code) {
        return appointmentRepositoryPort.findByBookingCode(code)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    public record DoctorSlotDto(
            String id,
            String time,
            int startMinutes,
            String status,
            String label,
            boolean disabled
    ) {}

    public record AppointmentDetailDto(
            String id,
            String bookingCode,
            String medicalCenterId,
            String medicalCenterName,
            String patientProfileId,
            String doctorId,
            String doctorName,
            String specialtyName,
            String roomNumber,
            String slotId,
            String slotTime,
            String appointmentDate,
            String queueNumber,
            String queueType,
            String patientSymptoms,
            String aiSummary,
            String status,
            Instant checkInTime,
            Instant createdAt,
            Instant updatedAt
    ) {}

    /**
     * Lấy danh sách khung giờ khám (TimeSlots) của bác sĩ theo ngày (phục vụ BookingForm).
     * Tự động sinh slot chuẩn nếu ngày đó bác sĩ chưa đăng ký ca làm việc tùy biến.
     */
    @GetMapping("/doctors/{doctorId}/slots")
    public ResponseEntity<List<DoctorSlotDto>> getDoctorSlots(
            @PathVariable String doctorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate targetDate = date != null ? date : LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
        Instant dayStart = targetDate.atStartOfDay(vnZone).toInstant();
        Instant dayEnd = targetDate.atTime(23, 59, 59).atZone(vnZone).toInstant();

        List<TimeSlotEntity> slots = timeSlotJpaRepository.findByDoctorIdAndStartTimeBetweenOrderByStartTimeAsc(
                doctorId, dayStart, dayEnd);

        boolean isAutoMode = com.medsched.doctor.DoctorScheduleService.isAutoScheduleActive();

        // Nếu Chế Độ Bác Sĩ Tự Đặt Lịch Thủ Công đang BẬT (!isAutoMode):
        // 1. Kiểm tra xem Bác sĩ có ca trực thực sự (ACTIVE) trong ngày này hay không.
        // 2. Nếu Bác sĩ chưa đăng ký ca trực hoặc chỉ có ca trực mẫu tự sinh 8:00-17:00 chưa có hẹn:
        //    Dọn dẹp các slot trống tự sinh (SlotStatus.AVAILABLE) và trả về rỗng.
        if (!isAutoMode) {
            List<DoctorScheduleEntity> activeSchedules = doctorScheduleJpaRepository.findByDoctorIdAndWorkDate(doctorId, targetDate)
                    .stream()
                    .filter(s -> s.getStatus() == ScheduleStatus.ACTIVE)
                    .toList();

            boolean hasBookedSlots = slots.stream().anyMatch(s -> s.getStatus() == SlotStatus.BOOKED);
            boolean isAutoPlaceholder = !activeSchedules.isEmpty()
                    && activeSchedules.size() == 1
                    && activeSchedules.get(0).getStartTime().equals(LocalTime.of(8, 0))
                    && activeSchedules.get(0).getEndTime().equals(LocalTime.of(17, 0))
                    && !hasBookedSlots;

            if (activeSchedules.isEmpty() || isAutoPlaceholder) {
                if (isAutoPlaceholder) {
                    doctorScheduleJpaRepository.deleteAll(activeSchedules);
                }
                if (!slots.isEmpty()) {
                    List<TimeSlotEntity> unbooked = slots.stream()
                            .filter(s -> s.getStatus() == SlotStatus.AVAILABLE)
                            .toList();
                    if (!unbooked.isEmpty()) {
                        timeSlotJpaRepository.deleteAll(unbooked);
                    }
                }
                return ResponseEntity.ok(Collections.emptyList());
            }
        }

        // Nếu bác sĩ chưa có slot nào trong ngày này, chỉ tự động sinh khi ở chế độ TỰ ĐỘNG (Auto-Schedule)
        if (slots.isEmpty()) {
            if (!isAutoMode) {
                return ResponseEntity.ok(Collections.emptyList());
            }

            Instant now = Instant.now();
            List<DoctorScheduleEntity> existingSchedules = doctorScheduleJpaRepository.findByDoctorIdAndWorkDate(doctorId, targetDate);
            String scheduleId;
            if (!existingSchedules.isEmpty()) {
                scheduleId = existingSchedules.get(0).getId();
            } else {
                scheduleId = UUID.randomUUID().toString();
                DoctorScheduleEntity newSchedule = new DoctorScheduleEntity(
                        scheduleId,
                        doctorId,
                        targetDate,
                        LocalTime.of(8, 0),
                        LocalTime.of(17, 0),
                        30,
                        ScheduleStatus.ACTIVE,
                        now,
                        now
                );
                doctorScheduleJpaRepository.save(newSchedule);
            }

            List<LocalTime[]> standardTimes = new ArrayList<>(List.of(
                    // Ca Sáng (08:00 - 12:00)
                    new LocalTime[]{LocalTime.of(8, 0), LocalTime.of(8, 30)},
                    new LocalTime[]{LocalTime.of(8, 30), LocalTime.of(9, 0)},
                    new LocalTime[]{LocalTime.of(9, 0), LocalTime.of(9, 30)},
                    new LocalTime[]{LocalTime.of(9, 30), LocalTime.of(10, 0)},
                    new LocalTime[]{LocalTime.of(10, 0), LocalTime.of(10, 30)},
                    new LocalTime[]{LocalTime.of(10, 30), LocalTime.of(11, 0)},
                    new LocalTime[]{LocalTime.of(11, 0), LocalTime.of(11, 30)},
                    new LocalTime[]{LocalTime.of(11, 30), LocalTime.of(12, 0)},
                    // Ca Chiều (13:30 - 17:00)
                    new LocalTime[]{LocalTime.of(13, 30), LocalTime.of(14, 0)},
                    new LocalTime[]{LocalTime.of(14, 0), LocalTime.of(14, 30)},
                    new LocalTime[]{LocalTime.of(14, 30), LocalTime.of(15, 0)},
                    new LocalTime[]{LocalTime.of(15, 0), LocalTime.of(15, 30)},
                    new LocalTime[]{LocalTime.of(15, 30), LocalTime.of(16, 0)},
                    new LocalTime[]{LocalTime.of(16, 0), LocalTime.of(16, 30)},
                    new LocalTime[]{LocalTime.of(16, 30), LocalTime.of(17, 0)}
            ));
            if (com.medsched.doctor.DoctorScheduleService.isDevMode247Active()) {
                // Ca Đêm (00:00 - 08:00) và Ca Tối (17:00 - 23:30) cho Chế Độ Develop 24/7
                standardTimes.addAll(List.of(
                        new LocalTime[]{LocalTime.of(0, 0), LocalTime.of(0, 30)},
                        new LocalTime[]{LocalTime.of(0, 30), LocalTime.of(1, 0)},
                        new LocalTime[]{LocalTime.of(1, 0), LocalTime.of(1, 30)},
                        new LocalTime[]{LocalTime.of(1, 30), LocalTime.of(2, 0)},
                        new LocalTime[]{LocalTime.of(2, 0), LocalTime.of(2, 30)},
                        new LocalTime[]{LocalTime.of(2, 30), LocalTime.of(3, 0)},
                        new LocalTime[]{LocalTime.of(3, 0), LocalTime.of(3, 30)},
                        new LocalTime[]{LocalTime.of(3, 30), LocalTime.of(4, 0)},
                        new LocalTime[]{LocalTime.of(4, 0), LocalTime.of(4, 30)},
                        new LocalTime[]{LocalTime.of(4, 30), LocalTime.of(5, 0)},
                        new LocalTime[]{LocalTime.of(5, 0), LocalTime.of(5, 30)},
                        new LocalTime[]{LocalTime.of(5, 30), LocalTime.of(6, 0)},
                        new LocalTime[]{LocalTime.of(6, 0), LocalTime.of(6, 30)},
                        new LocalTime[]{LocalTime.of(6, 30), LocalTime.of(7, 0)},
                        new LocalTime[]{LocalTime.of(7, 0), LocalTime.of(7, 30)},
                        new LocalTime[]{LocalTime.of(17, 0), LocalTime.of(17, 30)},
                        new LocalTime[]{LocalTime.of(17, 30), LocalTime.of(18, 0)},
                        new LocalTime[]{LocalTime.of(18, 0), LocalTime.of(18, 30)},
                        new LocalTime[]{LocalTime.of(18, 30), LocalTime.of(19, 0)},
                        new LocalTime[]{LocalTime.of(19, 0), LocalTime.of(19, 30)},
                        new LocalTime[]{LocalTime.of(19, 30), LocalTime.of(20, 0)},
                        new LocalTime[]{LocalTime.of(20, 0), LocalTime.of(20, 30)},
                        new LocalTime[]{LocalTime.of(20, 30), LocalTime.of(21, 0)},
                        new LocalTime[]{LocalTime.of(21, 0), LocalTime.of(21, 30)},
                        new LocalTime[]{LocalTime.of(21, 30), LocalTime.of(22, 0)},
                        new LocalTime[]{LocalTime.of(22, 0), LocalTime.of(22, 30)},
                        new LocalTime[]{LocalTime.of(22, 30), LocalTime.of(23, 0)},
                        new LocalTime[]{LocalTime.of(23, 0), LocalTime.of(23, 30)}
                ));
            }
            List<TimeSlotEntity> created = new ArrayList<>();
            for (LocalTime[] pair : standardTimes) {
                Instant slotStart = targetDate.atTime(pair[0]).atZone(vnZone).toInstant();
                Instant slotEnd = targetDate.atTime(pair[1]).atZone(vnZone).toInstant();
                TimeSlotEntity slot = new TimeSlotEntity(
                        UUID.randomUUID().toString(),
                        scheduleId,
                        doctorId,
                        slotStart,
                        slotEnd,
                        SlotStatus.AVAILABLE,
                        now,
                        now
                );
                created.add(slot);
            }
            slots = timeSlotJpaRepository.saveAll(created);
        }

        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm").withZone(vnZone);
        LocalTime nowTime = LocalTime.now(vnZone);
        boolean isToday = targetDate.equals(LocalDate.now(vnZone));

        List<DoctorSlotDto> dtos = slots.stream().map(s -> {
            LocalTime startLt = s.getStartTime().atZone(vnZone).toLocalTime();
            String timeStr = timeFormatter.format(s.getStartTime()) + " - " + timeFormatter.format(s.getEndTime());
            int startMinutes = startLt.getHour() * 60 + startLt.getMinute();

            boolean isPast = isToday && startLt.isBefore(nowTime);
            String status;
            String label;
            boolean disabled;

            if (isPast) {
                status = "expired";
                label = "Đã qua giờ";
                disabled = true;
            } else if (s.getStatus() == SlotStatus.BOOKED) {
                status = "full";
                label = "Đã kín chỗ";
                disabled = true;
            } else if (s.getStatus() == SlotStatus.LOCKED) {
                status = "locked";
                label = "Tạm khóa";
                disabled = true;
            } else {
                status = "available";
                label = "Khả dụng";
                disabled = false;
            }

            return new DoctorSlotDto(s.getId(), timeStr, startMinutes, status, label, disabled);
        }).toList();

        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/patient/{patientProfileId}")
    public ResponseEntity<List<AppointmentDetailDto>> getByPatient(@PathVariable String patientProfileId) {
        List<AppointmentEntity> entities = appointmentJpaRepository.findByPatientProfileIdOrderByCreatedAtDesc(patientProfileId);
        ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm").withZone(vnZone);
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(vnZone);

        List<AppointmentDetailDto> result = entities.stream().map(e -> {
            String doctorName = "Bác sĩ phụ trách";
            String specialtyName = null;
            String roomNumber = null;
            if (e.getDoctorId() != null) {
                DoctorEntity doc = doctors.findById(e.getDoctorId()).orElse(null);
                if (doc != null) {
                    if (doc.getRoomNumber() != null) {
                        roomNumber = doc.getRoomNumber();
                    }
                    if (doc.getSpecialtyId() != null) {
                        SpecialtyEntity spec = specialties.findById(doc.getSpecialtyId()).orElse(null);
                        if (spec != null) {
                            specialtyName = spec.getName();
                        }
                    }
                    UserEntity user = doc.getUserId() != null ? users.findById(doc.getUserId()).orElse(null) : null;
                    String userFullName = user != null ? user.getFullName() : "Bác sĩ";
                    doctorName = (doc.getAcademicTitle() != null ? doc.getAcademicTitle() + " " : "") + userFullName;
                }
            }

            String medicalCenterName = null;
            if (e.getMedicalCenterId() != null) {
                MedicalCenterEntity center = medicalCenters.findById(e.getMedicalCenterId()).orElse(null);
                if (center != null) {
                    medicalCenterName = center.getName();
                }
            }

            String slotTime = null;
            String appointmentDate = null;
            if (e.getSlotId() != null) {
                TimeSlotEntity slot = timeSlotJpaRepository.findById(e.getSlotId()).orElse(null);
                if (slot != null && slot.getStartTime() != null) {
                    slotTime = timeFormatter.format(slot.getStartTime()) + " - " + timeFormatter.format(slot.getEndTime());
                    appointmentDate = dateFormatter.format(slot.getStartTime());
                }
            } else if (e.getQueueType() == com.medsched.persistence.enums.QueueType.WALKIN
                    || (e.getBookingCode() != null && e.getBookingCode().startsWith("WALK-"))
                    || (e.getQueueNumber() != null && e.getQueueNumber().startsWith("W-"))) {
                Instant refTime = e.getCheckInTime() != null ? e.getCheckInTime() : e.getCreatedAt();
                if (refTime != null) {
                    slotTime = "Khám ngay (Tiếp nhận: " + timeFormatter.format(refTime) + ")";
                    appointmentDate = dateFormatter.format(refTime);
                } else {
                    slotTime = "Khám ngay tại quầy";
                }
            }

            String formattedQueueNum = e.getQueueNumber() != null ? e.getQueueNumber() : "";
            if (formattedQueueNum.startsWith("APP-")) {
                formattedQueueNum = "A-" + formattedQueueNum.substring(4);
            } else if (formattedQueueNum.startsWith("WALK-")) {
                formattedQueueNum = "W-" + formattedQueueNum.substring(5);
            } else if (!formattedQueueNum.isBlank() && !formattedQueueNum.startsWith("A-") && !formattedQueueNum.startsWith("W-")) {
                if (e.getQueueType() == com.medsched.persistence.enums.QueueType.WALKIN) {
                    formattedQueueNum = "W-" + formattedQueueNum;
                } else {
                    formattedQueueNum = "A-" + formattedQueueNum;
                }
            }

            return new AppointmentDetailDto(
                    e.getId(),
                    e.getBookingCode(),
                    e.getMedicalCenterId(),
                    medicalCenterName,
                    e.getPatientProfileId(),
                    e.getDoctorId(),
                    doctorName,
                    specialtyName,
                    roomNumber,
                    e.getSlotId(),
                    slotTime,
                    appointmentDate,
                    formattedQueueNum,
                    e.getQueueType() != null ? e.getQueueType().name() : null,
                    e.getPatientSymptoms(),
                    e.getAiSummary(),
                    e.getStatus() != null ? e.getStatus().name() : null,
                    e.getCheckInTime(),
                    e.getCreatedAt(),
                    e.getUpdatedAt()
            );
        }).toList();

        return ResponseEntity.ok(result);
    }

    public record CancelRequest(
            String reason
    ) {}

    public record CancelResponse(
            String id,
            String bookingCode,
            String status,
            String message
    ) {}

    /**
     * CLAB-105: Hủy lịch khám & Giải phóng khung giờ (slot).
     */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<CancelResponse> cancelAppointment(
            @PathVariable String id,
            @AuthenticationPrincipal AppUserDetails principal,
            @RequestBody(required = false) CancelRequest request) {
        validateAppointmentOwnership(id, principal);
        String reason = request != null ? request.reason() : null;
        Appointment appointment = cancelAppointmentUseCase.cancel(new CancelAppointmentUseCase.Command(id, reason));
        return ResponseEntity.ok(new CancelResponse(
                appointment.id(),
                appointment.bookingCode(),
                appointment.status(),
                "Hủy lịch hẹn thành công và đã hoàn lại khung giờ khám."
        ));
    }

    public record RescheduleRequest(
            @NotBlank String newSlotId,
            String symptoms
    ) {}

    public record RescheduleResponse(
            String id,
            String bookingCode,
            String status,
            String slotId,
            String doctorId,
            String message
    ) {}

    /**
     * Bệnh nhân đổi lịch hẹn sang khung giờ mới (CRUD Update - Reschedule).
     */
    @PatchMapping("/{id}/reschedule")
    @Transactional
    public ResponseEntity<RescheduleResponse> rescheduleAppointment(
            @PathVariable String id,
            @AuthenticationPrincipal AppUserDetails principal,
            @Valid @RequestBody RescheduleRequest request) {

        AppointmentEntity appointment = appointmentJpaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ca khám: " + id));

        // Kiểm tra quyền sở hữu ca khám
        validateAppointmentOwnership(id, principal);

        if (appointment.getStatus() != AppointmentStatus.CONFIRMED && appointment.getStatus() != AppointmentStatus.PENDING) {
            throw new IllegalArgumentException("Chỉ có thể đổi lịch cho ca khám chưa đến viện (CONFIRMED/PENDING). Ca hiện tại là: " + appointment.getStatus());
        }

        // Không cho phép dời lịch ca khám cũ đã trôi qua khung giờ hẹn trong quá khứ
        if (appointment.getSlotId() != null) {
            timeSlotJpaRepository.findById(appointment.getSlotId()).ifPresent(oldSlot -> {
                if (oldSlot.getStartTime() != null && oldSlot.getStartTime().isBefore(Instant.now())) {
                    throw new IllegalArgumentException("Ca khám cũ đã qua khung giờ hẹn trong quá khứ, không thể đổi lịch.");
                }
            });
        }

        TimeSlotEntity newSlot = timeSlotJpaRepository.findById(request.newSlotId())
                .orElseThrow(() -> new ResourceNotFoundException("Khung giờ mới không tồn tại: " + request.newSlotId()));

        if (newSlot.getStatus() != SlotStatus.AVAILABLE) {
            throw new IllegalArgumentException("Khung giờ mới đã có người đặt hoặc tạm khóa.");
        }

        if (newSlot.getStartTime().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Không thể chọn khung giờ đã trôi qua trong quá khứ.");
        }

        // Kiểm tra bệnh nhân không bị trùng lịch khám khác cùng khung giờ (Double-booking)
        validatePatientNotDoubleBookedForReschedule(appointment.getPatientProfileId(), appointment.getId(), newSlot);

        // 1. Giải phóng slot cũ
        if (appointment.getSlotId() != null && !appointment.getSlotId().isBlank()) {
            timeSlotJpaRepository.findById(appointment.getSlotId()).ifPresent(oldSlot -> {
                oldSlot.setStatus(SlotStatus.AVAILABLE);
                oldSlot.setUpdatedAt(Instant.now());
                timeSlotJpaRepository.save(oldSlot);
            });
        }

        // 2. Khóa slot mới
        newSlot.setStatus(SlotStatus.BOOKED);
        newSlot.setUpdatedAt(Instant.now());
        timeSlotJpaRepository.save(newSlot);

        // 3. Cập nhật ca khám
        appointment.setSlotId(newSlot.getId());
        if (newSlot.getDoctorId() != null && !newSlot.getDoctorId().isBlank()) {
            appointment.setDoctorId(newSlot.getDoctorId());
        }
        if (request.symptoms() != null && !request.symptoms().isBlank()) {
            appointment.setPatientSymptoms(request.symptoms());
        }
        appointment.setUpdatedAt(Instant.now());
        appointmentJpaRepository.save(appointment);

        return ResponseEntity.ok(new RescheduleResponse(
                appointment.getId(),
                appointment.getBookingCode(),
                appointment.getStatus().name(),
                appointment.getSlotId(),
                appointment.getDoctorId(),
                "Đổi lịch khám thành công sang khung giờ mới."
        ));
    }

    private void validateAppointmentOwnership(String appointmentId, AppUserDetails principal) {
        if (principal == null) {
            return;
        }
        boolean isStaffOrAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().contains("STAFF") || a.getAuthority().contains("ADMIN"));
        if (isStaffOrAdmin) {
            return;
        }
        appointmentJpaRepository.findById(appointmentId).ifPresent(app -> {
            if (app.getPatientProfileId() != null) {
                boolean ownsProfile = patientProfiles.findByUserId(principal.getUserId()).stream()
                        .anyMatch(p -> p.getId().equals(app.getPatientProfileId()));
                if (!ownsProfile) {
                    throw new org.springframework.security.access.AccessDeniedException("Bạn không có quyền thao tác trên ca khám này.");
                }
            }
        });
    }

    private void validatePatientNotDoubleBookedForReschedule(String patientProfileId, String currentAppId, TimeSlotEntity newSlot) {
        if (patientProfileId == null || newSlot.getStartTime() == null || newSlot.getEndTime() == null) {
            return;
        }
        List<AppointmentEntity> patientApps = appointmentJpaRepository.findByPatientProfileIdOrderByCreatedAtDesc(patientProfileId);
        for (AppointmentEntity app : patientApps) {
            if (app.getId().equals(currentAppId)) continue;
            boolean isActive = app.getStatus() == AppointmentStatus.PENDING
                    || app.getStatus() == AppointmentStatus.CONFIRMED
                    || app.getStatus() == AppointmentStatus.CHECKED_IN;
            if (!isActive || app.getSlotId() == null) continue;

            if (app.getSlotId().equals(newSlot.getId())) {
                throw new IllegalArgumentException("Bệnh nhân đã có ca khám khác trong cùng khung giờ này.");
            }
            timeSlotJpaRepository.findById(app.getSlotId()).ifPresent(s -> {
                if (s.getStartTime() != null && s.getEndTime() != null) {
                    boolean overlap = newSlot.getStartTime().isBefore(s.getEndTime()) && newSlot.getEndTime().isAfter(s.getStartTime());
                    if (overlap) {
                        throw new IllegalArgumentException("Bệnh nhân đã có một ca khám khác trùng khung giờ khám này.");
                    }
                }
            });
        }
    }

    /**
     * Bệnh nhân xem chi tiết kết quả khám & đơn thuốc điện tử của ca khám đã hoàn tất.
     */
    @GetMapping("/{id}/prescription")
    public ResponseEntity<DoctorPrescriptionDtos.PrescriptionDetailDto> getAppointmentPrescription(
            @PathVariable String id) {
        return ResponseEntity.ok(doctorPrescriptionService.getPrescriptionDetailsByAppointmentId(id));
    }
}
