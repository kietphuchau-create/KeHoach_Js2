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
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class DoctorScheduleService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm").withZone(VN_ZONE);

    /** Danh mục buồng khám lâm sàng chính thức do Quản Trị Viên (Admin) phê duyệt */
    public static final Set<String> APPROVED_CLINIC_ROOMS = Set.of(
            "P.101", "P.102", "P.205", "P.208", "P.209"
    );

    private final DoctorScheduleJpaRepository doctorScheduleRepository;
    private final TimeSlotJpaRepository timeSlotRepository;
    private final DoctorJpaRepository doctorRepository;
    private final UserJpaRepository userJpaRepository;
    private final AppointmentJpaRepository appointmentJpaRepository;
    private final PatientProfileJpaRepository patientProfileJpaRepository;

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
        String targetDoctorId = resolveDoctorId(userId, queryDoctorId);
        LocalDate today = LocalDate.now(VN_ZONE);

        // Quy tắc giáo viên: Nếu bác sĩ chưa đăng ký lịch trước, hệ thống tự động xếp lịch trực hôm nay
        ensureDefaultTodaySchedule(targetDoctorId, today);

        List<DoctorScheduleEntity> schedules;
        if (from != null && to != null) {
            schedules = doctorScheduleRepository.findByDoctorIdAndWorkDateBetweenOrderByWorkDateAscStartTimeAsc(targetDoctorId, from, to);
        } else {
            schedules = doctorScheduleRepository.findByDoctorIdOrderByWorkDateAscStartTimeAsc(targetDoctorId);
        }

        return schedules.stream().map(this::mapToDto).toList();
    }

    /**
     * Tự động xếp lịch trực mặc định cho Bác sĩ nếu chưa đăng ký trước
     * Ca sáng: 08:00 - 12:00, Ca chiều: 13:30 - 17:00
     */
    private void ensureDefaultTodaySchedule(String doctorId, LocalDate targetDate) {
        List<DoctorScheduleEntity> existing = doctorScheduleRepository.findByDoctorIdAndWorkDate(doctorId, targetDate);
        if (!existing.isEmpty()) {
            return;
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

            LocalTime cursor = start;
            List<TimeSlotEntity> createdSlots = new ArrayList<>();
            while (cursor.plusMinutes(duration).isBefore(end) || cursor.plusMinutes(duration).equals(end)) {
                LocalTime next = cursor.plusMinutes(duration);
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

        LocalDate today = LocalDate.now(VN_ZONE);
        // Quy tắc giáo viên: Chỉ được đăng ký ca trực trước tối thiểu 1 ngày (từ ngày mai trở đi)
        if (!request.workDate().isAfter(today)) {
            throw new IllegalArgumentException("Theo quy định phòng khám, Bác sĩ chỉ được đăng ký ca trực trước tối thiểu 1 ngày (từ ngày mai trở đi). Ca trực hôm nay được hệ thống tự động điều phối.");
        }

        // Chặn đăng ký ca trực vào cuối tuần (Thứ Bảy & Chủ Nhật)
        DayOfWeek dow = request.workDate().getDayOfWeek();
        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) {
            throw new IllegalArgumentException("Phòng khám không làm việc vào cuối tuần (Thứ Bảy & Chủ Nhật). Bác sĩ không thể đăng ký ca trực vào ngày này.");
        }

        // Chặn đăng ký ca trực ngoài giờ hành chính (08:00 - 17:00) hoặc trùng giờ nghỉ trưa (12:00 - 13:30)
        if (request.startTime().isBefore(LocalTime.of(8, 0)) || request.endTime().isAfter(LocalTime.of(17, 0))) {
            throw new IllegalArgumentException("Ca trực phải nằm trong khung giờ làm việc của phòng khám (08:00 - 17:00).");
        }
        if ((request.startTime().isAfter(LocalTime.of(12, 0)) && request.startTime().isBefore(LocalTime.of(13, 30)))
                || (request.endTime().isAfter(LocalTime.of(12, 0)) && request.endTime().isBefore(LocalTime.of(13, 30)))) {
            throw new IllegalArgumentException("Không thể đăng ký ca trực trùng vào khung giờ nghỉ trưa của phòng khám (12:00 - 13:30).");
        }

        DoctorEntity currentDoctor = doctorRepository.findById(targetDoctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin Bác sĩ trong hệ thống."));

        String targetRoom = (request.roomNumber() != null && !request.roomNumber().isBlank())
                ? request.roomNumber().trim().toUpperCase()
                : (currentDoctor.getRoomNumber() != null ? currentDoctor.getRoomNumber().trim().toUpperCase() : "P.208");

        // Chặn không cho phép tự ý nhập buồng khám ngoài danh mục do Admin phê duyệt
        if (!APPROVED_CLINIC_ROOMS.contains(targetRoom)) {
            throw new IllegalArgumentException("Buồng khám [" + targetRoom
                    + "] không hợp lệ hoặc chưa được Quản Trị Viên (Admin) phê duyệt. Vui lòng chỉ chọn các buồng khám hợp lệ: "
                    + String.join(", ", APPROVED_CLINIC_ROOMS));
        }

        // Cập nhật lại buồng khám chuyên môn của bác sĩ nếu có thay đổi
        if (request.roomNumber() != null && !request.roomNumber().isBlank()
                && !targetRoom.equalsIgnoreCase(currentDoctor.getRoomNumber())) {
            currentDoctor.setRoomNumber(targetRoom);
            currentDoctor.setUpdatedAt(Instant.now());
            doctorRepository.save(currentDoctor);
        }

        // 1. Kiểm tra chồng chéo ca trực trong ngày của CHÍNH bác sĩ đó
        List<DoctorScheduleEntity> existingInDate = doctorScheduleRepository.findByDoctorIdAndWorkDate(targetDoctorId, request.workDate());
        for (DoctorScheduleEntity ex : existingInDate) {
            if (ex.getStatus() == ScheduleStatus.ACTIVE) {
                boolean overlap = request.startTime().isBefore(ex.getEndTime()) && request.endTime().isAfter(ex.getStartTime());
                if (overlap) {
                    throw new IllegalArgumentException("Bác sĩ đã có ca trực trùng khung giờ ("
                            + ex.getStartTime() + " - " + ex.getEndTime() + ") trong ngày " + request.workDate());
                }
            }
        }

        // 2. [FIX DEFECT-ROOM-CONFLICT-01]: Kiểm tra XUNG ĐỘT BUỒNG KHÁM VỚI BÁC SĨ KHÁC
        List<DoctorScheduleEntity> allSchedulesOnDate = doctorScheduleRepository.findByWorkDate(request.workDate());
        for (DoctorScheduleEntity ex : allSchedulesOnDate) {
            if (ex.getStatus() == ScheduleStatus.ACTIVE && !ex.getDoctorId().equals(targetDoctorId)) {
                DoctorEntity otherDoctor = doctorRepository.findById(ex.getDoctorId()).orElse(null);
                if (otherDoctor != null) {
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

        // Sinh các slot 30 phút tự động
        LocalTime cursor = request.startTime();
        List<TimeSlotEntity> createdSlots = new ArrayList<>();
        while (cursor.plusMinutes(duration).isBefore(request.endTime()) || cursor.plusMinutes(duration).equals(request.endTime())) {
            LocalTime next = cursor.plusMinutes(duration);
            Instant slotStart = request.workDate().atTime(cursor).atZone(VN_ZONE).toInstant();
            Instant slotEnd = request.workDate().atTime(next).atZone(VN_ZONE).toInstant();

            if (slotEnd.isAfter(now)) {
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
            cursor = next;
        }

        timeSlotRepository.saveAll(createdSlots);
        return mapToDto(schedule);
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

        LocalDate today = LocalDate.now(VN_ZONE);
        if (!schedule.getWorkDate().isAfter(today)) {
            throw new IllegalArgumentException(
                    String.format("Theo quy định phòng khám, Bác sĩ chỉ được đổi buồng khám trước tối thiểu 1 ngày (trước 00:00:00). " +
                                  "Khi bước sang ngày khám mới (ngày: %s), buồng khám đã được chốt và đồng bộ với phiếu hẹn/màn hình gọi số của người bệnh.",
                                  schedule.getWorkDate())
            );
        }

        String targetDoctorId = resolveDoctorId(userId, null);
        if (!schedule.getDoctorId().equals(targetDoctorId)) {
            throw new IllegalArgumentException("Bác sĩ không có quyền thay đổi buồng khám của ca trực này.");
        }

        String targetRoom = (request.newRoomNumber() != null && !request.newRoomNumber().isBlank())
                ? request.newRoomNumber().trim().toUpperCase()
                : "";

        if (!APPROVED_CLINIC_ROOMS.contains(targetRoom)) {
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
        DayOfWeek dow = targetDate.getDayOfWeek();
        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) {
            return new DoctorScheduleDtos.AutoScheduleResultDto(
                    targetDate,
                    0, 0, 0,
                    "Ngày " + targetDate + " là cuối tuần (" + dow + "), phòng khám nghỉ theo quy định."
            );
        }

        List<DoctorEntity> doctors = doctorRepository.findAll();
        int doctorsCount = 0;
        int shiftsCount = 0;
        int slotsCount = 0;

        for (DoctorEntity doc : doctors) {
            List<DoctorScheduleEntity> existing = doctorScheduleRepository.findByDoctorIdAndWorkDate(doc.getId(), targetDate);
            if (!existing.isEmpty()) {
                // Bác sĩ đã chủ động đăng ký trước 17h -> Không can thiệp
                continue;
            }

            ensureDefaultTodaySchedule(doc.getId(), targetDate);
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

    private DoctorScheduleDtos.DoctorScheduleDto mapToDto(DoctorScheduleEntity schedule) {
        List<TimeSlotEntity> slots = timeSlotRepository.findByScheduleIdOrderByStartTimeAsc(schedule.getId());
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
                room
        );
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
