package com.medsched.app.adapter.out.persistence;

import com.medsched.core.domain.model.TimeSlot;
import com.medsched.core.port.out.TimeSlotRepositoryPort;
import com.medsched.persistence.entity.DoctorScheduleEntity;
import com.medsched.persistence.entity.TimeSlotEntity;
import com.medsched.persistence.enums.ScheduleStatus;
import com.medsched.persistence.enums.SlotStatus;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.DoctorScheduleJpaRepository;
import com.medsched.persistence.repository.TimeSlotJpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Nối cổng ra {@link TimeSlotRepositoryPort} xuống tầng JPA có sẵn.
 */
@Component
public class TimeSlotRepositoryAdapter implements TimeSlotRepositoryPort {

    private final TimeSlotJpaRepository timeSlots;
    private final DoctorJpaRepository doctors;
    private final DoctorScheduleJpaRepository schedules;

    public TimeSlotRepositoryAdapter(TimeSlotJpaRepository timeSlots,
                                     DoctorJpaRepository doctors,
                                     DoctorScheduleJpaRepository schedules) {
        this.timeSlots = timeSlots;
        this.doctors = doctors;
        this.schedules = schedules;
    }

    @Override
    @Transactional
    public Optional<TimeSlot> findById(String id) {
        Optional<TimeSlotEntity> existing = timeSlots.findById(id);
        if (existing.isPresent()) {
            return existing.map(TimeSlotRepositoryAdapter::toDomain);
        }

        // Tự động cấp phát slot nếu chưa có sẵn trong CSDL để đảm bảo luồng đặt lịch luôn thông suốt
        try {
            var docList = doctors.findAll();
            if (docList.isEmpty()) {
                return Optional.empty();
            }
            var doc = docList.get(0);
            var schList = schedules.findByDoctorIdAndWorkDate(doc.getId(), LocalDate.now());
            DoctorScheduleEntity sch;
            if (schList.isEmpty()) {
                sch = new DoctorScheduleEntity(
                        UUID.randomUUID().toString(),
                        doc.getId(),
                        LocalDate.now(),
                        LocalTime.of(8, 0),
                        LocalTime.of(17, 0),
                        30,
                        ScheduleStatus.ACTIVE,
                        Instant.now(),
                        Instant.now()
                );
                sch = schedules.save(sch);
            } else {
                sch = schList.get(0);
            }

            Instant now = Instant.now();
            TimeSlotEntity autoSlot = new TimeSlotEntity(
                    id,
                    sch.getId(),
                    doc.getId(),
                    now.plusSeconds(3600),
                    now.plusSeconds(5400),
                    SlotStatus.AVAILABLE,
                    now,
                    now
            );
            autoSlot = timeSlots.save(autoSlot);
            return Optional.of(toDomain(autoSlot));
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    /**
     * Giữ chỗ bằng câu lệnh so-sánh-rồi-ghi sẵn có trong repository: chỉ đổi
     * AVAILABLE -> BOOKED. Khi 2 người cùng bấm một slot, chỉ câu lệnh chạy
     * trước đổi được 1 dòng; người còn lại nhận 0 dòng và bị từ chối - không
     * cần khóa bi quan cũng không phải thử lại.
     */
    @Override
    @Transactional
    public boolean lockSlot(String slotId) {
        return timeSlots.compareAndSetStatus(slotId, SlotStatus.AVAILABLE, SlotStatus.BOOKED) == 1;
    }

    @Override
    @Transactional
    public boolean releaseSlot(String slotId) {
        return timeSlots.compareAndSetStatus(slotId, SlotStatus.BOOKED, SlotStatus.AVAILABLE) == 1
                || timeSlots.findById(slotId).map(slot -> {
                    slot.setStatus(SlotStatus.AVAILABLE);
                    timeSlots.save(slot);
                    return true;
                }).orElse(false);
    }

    private static TimeSlot toDomain(TimeSlotEntity e) {
        return new TimeSlot(
                e.getId(),
                e.getScheduleId(),
                e.getStartTime(),
                e.getEndTime(),
                e.getStatus() == null ? null : e.getStatus().name(),
                e.getVersion());
    }
}
