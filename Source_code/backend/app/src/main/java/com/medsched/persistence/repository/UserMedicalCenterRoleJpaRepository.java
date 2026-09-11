package com.medsched.persistence.repository;

import com.medsched.persistence.entity.UserMedicalCenterRoleEntity;
import com.medsched.persistence.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserMedicalCenterRoleJpaRepository extends JpaRepository<UserMedicalCenterRoleEntity, String> {

    /**
     * Nạp toàn bộ quyền nhân sự của 1 tài khoản (mọi chi nhánh) để Spring
     * Security dựng danh sách authority khi đăng nhập. Tài khoản không có dòng
     * nào vẫn hợp lệ: đó là bệnh nhân thuần, đặt lịch được ở mọi chi nhánh.
     */
    List<UserMedicalCenterRoleEntity> findByUserIdAndActiveTrue(String userId);

    boolean existsByUserIdAndMedicalCenterIdAndRoleAndActiveTrue(String userId, String medicalCenterId, UserRole role);

    List<UserMedicalCenterRoleEntity> findByMedicalCenterIdAndRole(String medicalCenterId, UserRole role);

}
