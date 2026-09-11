package com.medsched.persistence.repository;

import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.enums.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserJpaRepository extends JpaRepository<UserEntity, String> {

    Optional<UserEntity> findByEmail(String email);

    boolean existsByEmail(String email);

    /** Tìm theo email/họ tên, không lọc vai trò. Tham số q đã ở dạng %tu-khoa%. */
    @Query("""
            SELECT u FROM UserEntity u
            WHERE LOWER(u.email) LIKE :q OR LOWER(u.fullName) LIKE :q
            """)
    Page<UserEntity> search(@Param("q") String q, Pageable pageable);

    /**
     * Lọc nhân sự theo vai trò, có thể giới hạn trong 1 chi nhánh.
     * Đi qua bảng nối user_medical_center_roles vì bản 3.0 đã bỏ cột users.role.
     */
    @Query("""
            SELECT u FROM UserEntity u
            WHERE (LOWER(u.email) LIKE :q OR LOWER(u.fullName) LIKE :q)
              AND EXISTS (SELECT 1 FROM UserMedicalCenterRoleEntity r
                          WHERE r.userId = u.id AND r.active = true AND r.role = :role
                            AND (:centerId IS NULL OR r.medicalCenterId = :centerId))
            """)
    Page<UserEntity> searchByRole(@Param("q") String q,
                                  @Param("role") UserRole role,
                                  @Param("centerId") String centerId,
                                  Pageable pageable);

    /**
     * Khách hàng (bệnh nhân thuần) = tài khoản KHÔNG có dòng quyền nhân sự nào
     * đang hoạt động - đúng quy ước "ROLE_PATIENT là quyền mặc định" của bản 3.0.
     */
    @Query("""
            SELECT u FROM UserEntity u
            WHERE (LOWER(u.email) LIKE :q OR LOWER(u.fullName) LIKE :q)
              AND NOT EXISTS (SELECT 1 FROM UserMedicalCenterRoleEntity r
                              WHERE r.userId = u.id AND r.active = true)
            """)
    Page<UserEntity> searchCustomers(@Param("q") String q, Pageable pageable);

}
