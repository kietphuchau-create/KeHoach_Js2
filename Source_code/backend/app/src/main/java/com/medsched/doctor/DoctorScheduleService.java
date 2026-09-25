package com.medsched.doctor;

import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.entity.DoctorScheduleEntity;
import com.medsched.persistence.entity.TimeSlotEntity;
import com.medsched.persistence.enums.ScheduleStatus;
import com.medsched.persistence.enums.SlotStatus;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.DoctorScheduleJpaRepository;
import com.medsched.persistence.repository.TimeSlotJpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class DoctorScheduleService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm").withZone(VN_ZONE);

    private final DoctorScheduleJpaRepository doctorScheduleRepository;
    private final TimeSlotJpaRepository timeSlotRepository;
    private final DoctorJpaRepository doctorRepository;

    public DoctorScheduleService(DoctorScheduleJpaRepository doctorScheduleRepository,
                                 TimeSlotJpaRepository timeSlotRepository,
                                 DoctorJpaRepository doctorRepository) {
        this.doctorScheduleRepository = doctorScheduleRepository;
        this.timeSlotRepository = timeSlotRepository;
        this.doctorRepository = doctorRepository;
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

    @Transactional(readOnly = true)
    public List<DoctorScheduleDtos.DoctorScheduleDto> getDoctorSchedules(String userId, String queryDoctorId, LocalDate from, LocalDate to) {
        String targetDoctorId = resolveDoctorId(userId, queryDoctorId);

        List<DoctorScheduleEntity> schedules;
        if (from != null && to != null) {
            schedules = doctorScheduleRepository.findByDoctorIdAndWorkDateBetweenOrderByWorkDateAscStartTimeAsc(targetDoctorId, from, to);
        } else {
            schedules = doctorScheduleRepository.findByDoctorIdOrderByWorkDateAscStartTimeAsc(targetDoctorId);
        }

        return schedules.stream().map(this::mapToDto).toList();
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
        if (request.workDate().isBefore(today)) {
            throw new IllegalArgumentException("Không thể đăng ký ca trực cho ngày trong quá khứ.");
        }
        if (request.workDate().equals(today) && request.endTime().isBefore(LocalTime.now(VN_ZONE))) {
            throw new IllegalArgumentException("Thời gian kết thúc ca trực không thể trước thời điểm hiện tại (" + LocalTime.now(VN_ZONE).toString().substring(0, 5) + ").");
        }

        // Kiểm tra chồng chéo ca trực trong ngày
        List<DoctorScheduleEntity> existingInDate = doctorScheduleRepository.findByDoctorIdAndWorkDate(targetDoctorId, request.workDate());
        for (DoctorScheduleEntity ex : existingInDate) {
            if (ex.getStatus() == ScheduleStatus.ACTIVE) {
                boolean overlap = !request.endTime().isBefore(ex.getStartTime()) && !request.startTime().isAfter(ex.getEndTime());
                if (overlap) {
                    throw new IllegalArgumentException("Bác sĩ đã có ca trực trùng khung giờ ("
                            + ex.getStartTime() + " - " + ex.getEndTime() + ") trong ngày " + request.workDate());
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
    public void deleteSchedule(String scheduleId) {
        DoctorScheduleEntity schedule = doctorScheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ca trực: " + scheduleId));

        List<TimeSlotEntity> slots = timeSlotRepository.findByScheduleIdOrderByStartTimeAsc(scheduleId);
        boolean hasBooked = slots.stream().anyMatch(s -> s.getStatus() == SlotStatus.BOOKED);
        if (hasBooked) {
            throw new IllegalArgumentException("Không thể xóa ca trực đã có bệnh nhân đặt lịch hẹn. Vui lòng liên hệ điều chuyển hoặc hủy ca khám trước.");
        }

        timeSlotRepository.deleteAll(slots);
        doctorScheduleRepository.delete(schedule);
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
                slotDtos
        );
    }
}
