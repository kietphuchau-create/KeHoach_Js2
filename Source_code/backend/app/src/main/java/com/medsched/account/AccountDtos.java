package com.medsched.account;

import com.medsched.persistence.enums.Gender;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Contracts for the "/api/v1/me" endpoints - shared by all four roles. */
public final class AccountDtos {

    private AccountDtos() {
    }

    /** Details of the currently signed-in account. */
    public record MeResponse(String userId,
                             String email,
                             String fullName,
                             String phone,
                             boolean active,
                             List<String> roles,
                             List<DoctorProfileView> doctorProfiles,
                             PatientProfileView patientProfile) {
    }

    /**
     * One practising profile of a doctor. A doctor working at two branches has
     * two entries, per the v3.0 UNIQUE(user_id, specialty_id) design.
     */
    public record DoctorProfileView(String doctorId,
                                    String specialtyId,
                                    String specialtyName,
                                    String medicalCenterId,
                                    String medicalCenterName,
                                    String academicTitle,
                                    BigDecimal consultationFee,
                                    String roomNumber,
                                    String bio,
                                    String avatarUrl) {
    }

    /** The account owner own patient profile (relationship = SELF). */
    public record PatientProfileView(String profileId,
                                     String fullName,
                                     String cccdNumber,
                                     String healthInsuranceNo,
                                     LocalDate dateOfBirth,
                                     Gender gender,
                                     String phone,
                                     String address,
                                     String medicalHistory) {
    }

    /** Update Profile - account details, shared by every role. */
    public record UpdateProfileRequest(
            @NotBlank(message = "Họ tên không được để trống")
            @Size(max = 255, message = "Họ tên tối đa 255 ký tự")
            String fullName,

            @Pattern(regexp = "^$|^0[0-9]{8,10}$", message = "Số điện thoại phải bắt đầu bằng 0 và có 9-11 số")
            String phone) {
    }

    /** Change Password - shared by every role. */
    public record ChangePasswordRequest(
            @NotBlank(message = "Mật khẩu hiện tại không được để trống")
            String currentPassword,

            @NotBlank(message = "Mật khẩu mới không được để trống")
            @Size(min = 8, max = 72, message = "Mật khẩu mới phải từ 8 đến 72 ký tự")
            String newPassword) {
    }

    /**
     * Doctor - Update Profile (professional details). Doctors deliberately
     * CANNOT edit {@code consultationFee} or {@code roomNumber}: the fee and the
     * room are decided by the clinic and belong to the admin.
     */
    public record UpdateDoctorProfileRequest(
            @Size(max = 100, message = "Học hàm/học vị tối đa 100 ký tự")
            String academicTitle,

            String bio,

            @Size(max = 500, message = "Đường dẫn ảnh tối đa 500 ký tự")
            String avatarUrl) {
    }

    /** Customer - Update Profile (the account owner own medical profile). */
    public record UpdatePatientProfileRequest(
            @NotBlank(message = "Họ tên người khám không được để trống")
            @Size(max = 255, message = "Họ tên tối đa 255 ký tự")
            String fullName,

            @Pattern(regexp = "^$|^[0-9]{9,12}$", message = "Số CCCD phải gồm 9-12 chữ số")
            String cccdNumber,

            @Size(max = 30, message = "Mã BHYT tối đa 30 ký tự")
            String healthInsuranceNo,

            LocalDate dateOfBirth,

            Gender gender,

            @Pattern(regexp = "^$|^0[0-9]{8,10}$", message = "Số điện thoại phải bắt đầu bằng 0 và có 9-11 số")
            String phone,

            @Size(max = 500, message = "Địa chỉ tối đa 500 ký tự")
            String address,

            String medicalHistory) {
    }

}
