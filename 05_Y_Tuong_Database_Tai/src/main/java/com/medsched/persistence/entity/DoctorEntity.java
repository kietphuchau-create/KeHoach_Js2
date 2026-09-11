package com.medsched.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "doctors", uniqueConstraints = @UniqueConstraint(
        name = "uq_doctors_user_specialty", columnNames = {"user_id", "specialty_id"}))
public class DoctorEntity {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Column(name = "specialty_id", nullable = false, length = 36)
    private String specialtyId;

    @Column(name = "academic_title", length = 100)
    private String academicTitle;

    @Column(name = "experience_years", nullable = false)
    private int experienceYears;

    @Column(name = "consultation_fee", nullable = false, precision = 19, scale = 2)
    private BigDecimal consultationFee;

    @Column(name = "room_number", length = 50)
    private String roomNumber;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "created_by", length = 36)
    private String createdBy;

    @Column(name = "updated_by", length = 36)
    private String updatedBy;

    protected DoctorEntity() {
    }

    public DoctorEntity(String id, String userId, String specialtyId, String academicTitle, int experienceYears,
                        BigDecimal consultationFee, String roomNumber, String bio, String avatarUrl,
                        Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.userId = userId;
        this.specialtyId = specialtyId;
        this.academicTitle = academicTitle;
        this.experienceYears = experienceYears;
        this.consultationFee = consultationFee;
        this.roomNumber = roomNumber;
        this.bio = bio;
        this.avatarUrl = avatarUrl;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public String getSpecialtyId() {
        return specialtyId;
    }

    public String getAcademicTitle() {
        return academicTitle;
    }

    public int getExperienceYears() {
        return experienceYears;
    }

    public BigDecimal getConsultationFee() {
        return consultationFee;
    }

    public String getRoomNumber() {
        return roomNumber;
    }

    public String getBio() {
        return bio;
    }

    public String getAvatarUrl() {
        return avatarUrl;
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


    // Setter phục vụ các luồng cập nhật của Task 1 (sửa hồ sơ, đổi mật khẩu, CRUD danh mục).

    public void setAcademicTitle(String academicTitle) {
        this.academicTitle = academicTitle;
    }

    public void setExperienceYears(int experienceYears) {
        this.experienceYears = experienceYears;
    }

    public void setConsultationFee(BigDecimal consultationFee) {
        this.consultationFee = consultationFee;
    }

    public void setRoomNumber(String roomNumber) {
        this.roomNumber = roomNumber;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

}
