package com.medsched.persistence.repository;

import com.medsched.persistence.entity.DoctorScheduleEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface DoctorScheduleJpaRepository extends JpaRepository<DoctorScheduleEntity, String> {

    List<DoctorScheduleEntity> findByDoctorIdAndWorkDate(String doctorId, LocalDate workDate);

    /**
     * Lấy toàn bộ ca trực của 1 bác sĩ (theo users.id, không phải doctors.id của riêng 1 chi nhánh)
     * trong khoảng ngày để kiểm tra chồng chéo giờ trực đa chi nhánh (kịch bản 7.9).
     * doctorIds truyền vào là danh sách doctors.id ứng với cùng 1 user_id ở các medical_center khác nhau.
     */
    List<DoctorScheduleEntity> findByDoctorIdInAndWorkDateBetween(List<String> doctorIds, LocalDate from, LocalDate to);

}
