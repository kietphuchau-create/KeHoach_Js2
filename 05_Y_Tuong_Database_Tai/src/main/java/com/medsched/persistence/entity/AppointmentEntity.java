package com.medsched.persistence.entity;

import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.CheckinMethod;
import com.medsched.persistence.enums.QueueType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "appointments")
public class AppointmentEntity {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @Column(name = "booking_code", nullable = false, unique = true, length = 16)
    private String bookingCode;

    /**
     * Chi nhánh diễn ra ca khám. Vì UserEntity là danh tính toàn cục (không gắn
     * chi nhánh), đây là nơi duy nhất cho biết bệnh nhân đến khám ở đâu - nhờ vậy
     * 1 tài khoản có ca khám ở nhiều chi nhánh mà không cần tạo account mới.
     */
    @Column(name = "medical_center_id", nullable = false, length = 36)
    private String medicalCenterId;

    @Column(name = "patient_profile_id", nullable = false, length = 36)
    private String patientProfileId;

    @Column(name = "doctor_id", nullable = false, length = 36)
    private String doctorId;

    /** NULL với khách vãng lai chưa gắn slot cố định (chỉ có số thứ tự chờ). */
    @Column(name = "slot_id", length = 36)
    private String slotId;

    @Column(name = "queue_number", nullable = false, length = 20)
    private String queueNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "queue_type", nullable = false, length = 20)
    private QueueType queueType;

    @Column(name = "patient_symptoms", columnDefinition = "TEXT")
    private String patientSymptoms;

    @Column(name = "ai_summary", columnDefinition = "TEXT")
    private String aiSummary;

    @Enumerated(EnumType.STRING)
    @Column(name = "checkin_method", length = 30)
    private CheckinMethod checkinMethod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AppointmentStatus status;

    @Column(name = "is_delayed", nullable = false)
    private boolean delayed;

    @Column(name = "delay_minutes", nullable = false)
    private int delayMinutes;

    @Column(name = "check_in_time")
    private Instant checkInTime;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "created_by", length = 36)
    private String createdBy;

    @Column(name = "updated_by", length = 36)
    private String updatedBy;

    protected AppointmentEntity() {
    }

    public AppointmentEntity(String id, String bookingCode, String medicalCenterId, String patientProfileId,
                             String doctorId, String slotId,
                             String queueNumber, QueueType queueType, String patientSymptoms,
                             AppointmentStatus status,
                             Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.bookingCode = bookingCode;
        this.medicalCenterId = medicalCenterId;
        this.patientProfileId = patientProfileId;
        this.doctorId = doctorId;
        this.slotId = slotId;
        this.queueNumber = queueNumber;
        this.queueType = queueType;
        this.patientSymptoms = patientSymptoms;
        this.status = status;
        this.delayed = false;
        this.delayMinutes = 0;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() {
        return id;
    }

    public String getBookingCode() {
        return bookingCode;
    }

    public String getMedicalCenterId() {
        return medicalCenterId;
    }

    public String getPatientProfileId() {
        return patientProfileId;
    }

    public String getDoctorId() {
        return doctorId;
    }

    public String getSlotId() {
        return slotId;
    }

    public void setSlotId(String slotId) {
        this.slotId = slotId;
    }

    public String getQueueNumber() {
        return queueNumber;
    }

    public QueueType getQueueType() {
        return queueType;
    }

    public String getPatientSymptoms() {
        return patientSymptoms;
    }

    public String getAiSummary() {
        return aiSummary;
    }

    public void setAiSummary(String aiSummary) {
        this.aiSummary = aiSummary;
    }

    public CheckinMethod getCheckinMethod() {
        return checkinMethod;
    }

    public void setCheckinMethod(CheckinMethod checkinMethod) {
        this.checkinMethod = checkinMethod;
    }

    public AppointmentStatus getStatus() {
        return status;
    }

    public void setStatus(AppointmentStatus status) {
        this.status = status;
    }

    public boolean isDelayed() {
        return delayed;
    }

    public void setDelayed(boolean delayed) {
        this.delayed = delayed;
    }

    public int getDelayMinutes() {
        return delayMinutes;
    }

    public void setDelayMinutes(int delayMinutes) {
        this.delayMinutes = delayMinutes;
    }

    public Instant getCheckInTime() {
        return checkInTime;
    }

    public void setCheckInTime(Instant checkInTime) {
        this.checkInTime = checkInTime;
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
