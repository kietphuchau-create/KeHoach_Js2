package com.medsched.core.port.out;

import com.medsched.core.domain.model.TimeSlot;

import java.util.Optional;

/**
 * Cổng ra cho khung giờ khám.
 * Bản cài đặt nằm ở {@code app/adapter/out/persistence/TimeSlotRepositoryAdapter}.
 */
public interface TimeSlotRepositoryPort {

    Optional<TimeSlot> findById(String id);

    /**
     * Giữ chỗ một slot theo kiểu so-sánh-rồi-ghi (compare-and-set): chỉ đổi được
     * trạng thái khi slot vẫn đang AVAILABLE.
     *
     * @return true nếu giữ chỗ thành công; false nếu slot vừa bị người khác giữ
     *         trước (kịch bản 2 bệnh nhân cùng bấm 1 slot) - tầng gọi phải báo
     *         xung đột cho người dùng thay vì thử lại vô hạn.
     */
    boolean lockSlot(String slotId);
}
