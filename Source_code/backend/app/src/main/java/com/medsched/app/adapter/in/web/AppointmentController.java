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
import com.medsched.core.domain.exception.ResourceNotFoundException;
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
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
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

        BookAppointmentUseCase.Command command = new BookAppointmentUseCase.Command(
                centerId,
                patientProfileId,
                doctorId,
                request.slotId(),
                request.symptoms(),
                request.medicalHistory()
        );
        Appointment result = bookAppointmentUseCase.book(command);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
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

        // Nếu bác sĩ chưa có slot nào trong ngày này, tự động sinh ca trực & các slot khám chuẩn
        if (slots.isEmpty()) {
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

            List<LocalTime[]> standardTimes = List.of(
                    new LocalTime[]{LocalTime.of(8, 0), LocalTime.of(8, 30)},
                    new LocalTime[]{LocalTime.of(8, 30), LocalTime.of(9, 0)},
                    new LocalTime[]{LocalTime.of(9, 0), LocalTime.of(9, 30)},
                    new LocalTime[]{LocalTime.of(9, 30), LocalTime.of(10, 0)},
                    new LocalTime[]{LocalTime.of(10, 0), LocalTime.of(10, 30)},
                    new LocalTime[]{LocalTime.of(10, 30), LocalTime.of(11, 0)},
                    new LocalTime[]{LocalTime.of(11, 0), LocalTime.of(11, 30)},
                    new LocalTime[]{LocalTime.of(14, 0), LocalTime.of(14, 30)},
                    new LocalTime[]{LocalTime.of(14, 30), LocalTime.of(15, 0)}
            );
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
                    e.getQueueNumber(),
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
            @RequestBody(required = false) CancelRequest request) {
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
            @Valid @RequestBody RescheduleRequest request) {

        AppointmentEntity appointment = appointmentJpaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ca khám: " + id));

        if (appointment.getStatus() != AppointmentStatus.CONFIRMED && appointment.getStatus() != AppointmentStatus.PENDING) {
            throw new IllegalArgumentException("Chỉ có thể đổi lịch cho ca khám chưa đến viện (CONFIRMED/PENDING). Ca hiện tại là: " + appointment.getStatus());
        }

        TimeSlotEntity newSlot = timeSlotJpaRepository.findById(request.newSlotId())
                .orElseThrow(() -> new ResourceNotFoundException("Khung giờ mới không tồn tại: " + request.newSlotId()));

        if (newSlot.getStatus() != SlotStatus.AVAILABLE) {
            throw new IllegalArgumentException("Khung giờ mới đã có người đặt hoặc tạm khóa.");
        }

        if (newSlot.getStartTime().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Không thể chọn khung giờ đã trôi qua trong quá khứ.");
        }

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

    /**
     * Bệnh nhân xem chi tiết kết quả khám & đơn thuốc điện tử của ca khám đã hoàn tất.
     */
    @GetMapping("/{id}/prescription")
    public ResponseEntity<DoctorPrescriptionDtos.PrescriptionDetailDto> getAppointmentPrescription(
            @PathVariable String id) {
        return ResponseEntity.ok(doctorPrescriptionService.getPrescriptionDetailsByAppointmentId(id));
    }
}
