package com.medsched.persistence.repository;

import com.medsched.persistence.entity.PatientProfileEntity;
import com.medsched.persistence.enums.RelationshipType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PatientProfileJpaRepository extends JpaRepository<PatientProfileEntity, String> {

    /** Toàn bộ hồ sơ gia đình (SELF/PARENT/CHILD/SPOUSE) do 1 tài khoản quản lý. */
    List<PatientProfileEntity> findByUserId(String userId);

    /** Hồ sơ của chính chủ tài khoản, tạo sẵn khi đăng ký (Task 1). */
    Optional<PatientProfileEntity> findByUserIdAndRelationship(String userId, RelationshipType relationship);

    /** Dùng để đối soát CCCD quét tại quầy với đúng hồ sơ đã đặt lịch (kịch bản 7.7 - nhầm hồ sơ người thân). */
    Optional<PatientProfileEntity> findByCccdNumber(String cccdNumber);

}
