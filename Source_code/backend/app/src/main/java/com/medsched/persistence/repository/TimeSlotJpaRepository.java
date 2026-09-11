package com.medsched.persistence.repository;

import com.medsched.persistence.entity.TimeSlotEntity;
import com.medsched.persistence.enums.SlotStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface TimeSlotJpaRepository extends JpaRepository<TimeSlotEntity, String> {

    List<TimeSlotEntity> findByDoctorIdAndStatusOrderByStartTimeAsc(String doctorId, SlotStatus status);

    /**
     * Compare-and-swap trực tiếp trên cột status, dùng cho luồng đặt lịch tần suất cao
     * thay vì load cả entity + dựa vào @Version (kịch bản 7.6 - 2 bệnh nhân cùng bấm 1 slot).
     * Trả về số dòng bị ảnh hưởng: 0 nghĩa là slot đã bị người khác giữ trước, tầng service
     * (của Hiếu) phải trả HTTP 409 Conflict cho request thua cuộc thay vì retry vô hạn.
     * Lưu ý: UPDATE hàng loạt qua JPQL không tự tăng @Version, nên set thẳng version ở đây.
     */
    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update TimeSlotEntity t set t.status = :newStatus, t.version = t.version + 1 "
        + "where t.id = :id and t.status = :expectedStatus")
    int compareAndSetStatus(@Param("id") String id,
                            @Param("expectedStatus") SlotStatus expectedStatus,
                            @Param("newStatus") SlotStatus newStatus);

}
