package com.medsched.persistence.entity;

import com.medsched.persistence.enums.UserRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

/**
 * Quyền nhân sự của 1 tài khoản tại 1 chi nhánh cụ thể.
 * <p>
 * Thay cho cột {@code users.role} cũ: tài khoản giờ là danh tính toàn cục, còn
 * quyền bác sĩ/lễ tân/admin có phạm vi theo từng chi nhánh. 1 bác sĩ trực ở 2
 * chi nhánh = 2 dòng. Tài khoản không có dòng nào ở đây vẫn đặt lịch khám bình
 * thường ở mọi chi nhánh (vai trò bệnh nhân là quyền mặc định).
 */
@Entity
@Table(name = "user_medical_center_roles", uniqueConstraints = @UniqueConstraint(
        name = "uq_user_center_role", columnNames = {"user_id", "medical_center_id", "role"}))
public class UserMedicalCenterRoleEntity {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Column(name = "medical_center_id", nullable = false, length = 36)
    private String medicalCenterId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private UserRole role;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "created_by", length = 36)
    private String createdBy;

    @Column(name = "updated_by", length = 36)
    private String updatedBy;

    protected UserMedicalCenterRoleEntity() {
    }

    public UserMedicalCenterRoleEntity(String id, String userId, String medicalCenterId, UserRole role,
                                       Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.userId = userId;
        this.medicalCenterId = medicalCenterId;
        this.role = role;
        this.active = true;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public String getMedicalCenterId() {
        return medicalCenterId;
    }

    public UserRole getRole() {
        return role;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public String getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }

}
