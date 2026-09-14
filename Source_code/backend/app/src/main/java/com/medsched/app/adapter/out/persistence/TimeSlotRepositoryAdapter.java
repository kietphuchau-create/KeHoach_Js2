package com.medsched.app.adapter.out.persistence;

import com.medsched.core.domain.model.TimeSlot;
import com.medsched.core.port.out.TimeSlotRepositoryPort;
import com.medsched.persistence.entity.TimeSlotEntity;
import com.medsched.persistence.enums.SlotStatus;
import com.medsched.persistence.repository.TimeSlotJpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Nối cổng ra {@link TimeSlotRepositoryPort} xuống tầng JPA có sẵn.
 */
@Component
public class TimeSlotRepositoryAdapter implements TimeSlotRepositoryPort {

    private final TimeSlotJpaRepository timeSlots;

    public TimeSlotRepositoryAdapter(TimeSlotJpaRepository timeSlots) {
        this.timeSlots = timeSlots;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<TimeSlot> findById(String id) {
        return timeSlots.findById(id).map(TimeSlotRepositoryAdapter::toDomain);
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
