package com.medsched.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Một dòng thuốc trong đơn, thay cho cột {@code medical_records.prescription}
 * kiểu TEXT trước đây - nhờ vậy mới thống kê được thuốc kê nhiều nhất, kiểm tra
 * tương tác thuốc hay kết nối kho dược.
 * <p>
 * {@code medicineName} và {@code unit} là BẢN CHỤP (snapshot) tại thời điểm kê
 * đơn, cố ý lưu trùng với danh mục {@link MedicineEntity}: yêu cầu y tế là đơn
 * thuốc cũ phải in lại đúng như đã kê, dù sau này danh mục đổi tên thuốc hoặc
 * ngừng lưu hành. Cùng nguyên tắc với order_items lưu kèm name/unit_price trong
 * repo tham khảo spring-ai-demo (EvShop).
 * <p>
 * {@code medicineId} cho phép NULL để bác sĩ kê thuốc ngoài danh mục chi nhánh.
 */
@Entity
@Table(name = "prescription_items")
public class PrescriptionItemEntity {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @Column(name = "medical_record_id", nullable = false, length = 36)
    private String medicalRecordId;

    @Column(name = "medicine_id", length = 36)
    private String medicineId;

    @Column(name = "medicine_name", nullable = false, length = 255)
    private String medicineName;

    @Column(nullable = false, length = 30)
    private String unit;

    /** Hàm lượng mỗi lần dùng, ví dụ "500mg". */
    @Column(nullable = false, length = 100)
    private String dosage;

    /** Cách dùng, ví dụ "2 lần/ngày sau ăn". */
    @Column(nullable = false, length = 100)
    private String frequency;

    @Column(name = "duration_days")
    private Integer durationDays;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal quantity;

    @Column(length = 500)
    private String instruction;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "created_by", length = 36)
    private String createdBy;

    @Column(name = "updated_by", length = 36)
    private String updatedBy;

    protected PrescriptionItemEntity() {
    }

    public PrescriptionItemEntity(String id, String medicalRecordId, String medicineId, String medicineName,
                                  String unit, String dosage, String frequency, Integer durationDays,
                                  BigDecimal quantity, String instruction, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.medicalRecordId = medicalRecordId;
        this.medicineId = medicineId;
        this.medicineName = medicineName;
        this.unit = unit;
        this.dosage = dosage;
        this.frequency = frequency;
        this.durationDays = durationDays;
        this.quantity = quantity;
        this.instruction = instruction;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() {
        return id;
    }

    public String getMedicalRecordId() {
        return medicalRecordId;
    }

    public String getMedicineId() {
        return medicineId;
    }

    public String getMedicineName() {
        return medicineName;
    }

    public String getUnit() {
        return unit;
    }

    public String getDosage() {
        return dosage;
    }

    public String getFrequency() {
        return frequency;
    }

    public Integer getDurationDays() {
        return durationDays;
    }

    public BigDecimal getQuantity() {
        return quantity;
    }

    public String getInstruction() {
        return instruction;
    }

    public void setInstruction(String instruction) {
        this.instruction = instruction;
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
