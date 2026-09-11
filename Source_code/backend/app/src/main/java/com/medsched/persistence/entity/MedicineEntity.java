package com.medsched.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

/** Danh mục thuốc của một chi nhánh, dùng để kê đơn trong prescription_items. */
@Entity
@Table(name = "medicines", uniqueConstraints = @UniqueConstraint(
        name = "uq_center_medicine", columnNames = {"medical_center_id", "code"}))
public class MedicineEntity {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @Column(name = "medical_center_id", nullable = false, length = 36)
    private String medicalCenterId;

    @Column(nullable = false, length = 50)
    private String code;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "active_ingredient", length = 255)
    private String activeIngredient;

    /** Đơn vị cấp phát: VIÊN, CHAI, ỐNG, GÓI, TUÝP... */
    @Column(nullable = false, length = 30)
    private String unit;

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

    protected MedicineEntity() {
    }

    public MedicineEntity(String id, String medicalCenterId, String code, String name, String activeIngredient,
                          String unit, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.medicalCenterId = medicalCenterId;
        this.code = code;
        this.name = name;
        this.activeIngredient = activeIngredient;
        this.unit = unit;
        this.active = true;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() {
        return id;
    }

    public String getMedicalCenterId() {
        return medicalCenterId;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getActiveIngredient() {
        return activeIngredient;
    }

    public void setActiveIngredient(String activeIngredient) {
        this.activeIngredient = activeIngredient;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
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
