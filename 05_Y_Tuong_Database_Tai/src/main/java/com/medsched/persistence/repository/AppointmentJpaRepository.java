package com.medsched.persistence.repository;

import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AppointmentJpaRepository extends JpaRepository<AppointmentEntity, String> {

    Optional<AppointmentEntity> findByBookingCode(String bookingCode);

    /** Nguồn dữ liệu cho màn hình điều phối hàng đợi (Luồng 5 / mục 7.0): sắp theo queue_number. */
    List<AppointmentEntity> findByDoctorIdAndStatusInOrderByQueueNumberAsc(String doctorId,
                                                                           Collection<AppointmentStatus> statuses);

    List<AppointmentEntity> findByPatientProfileIdOrderByCreatedAtDesc(String patientProfileId);

}
