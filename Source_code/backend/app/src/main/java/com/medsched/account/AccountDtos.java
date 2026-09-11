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

/** Hợp đồng dữ liệu cho nhóm endpoint "/api/v1/me" - dùng chung cho cả 4 vai trò. */
public final class AccountDtos {

    private AccountDtos() {
    }

    /** Thông tin tài khoản đang đăng nhập. */
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
     * Một hồ sơ hành nghề của bác sĩ. Bác sĩ trực ở 2 chi nhánh sẽ có 2 phần tử
     * (đúng thiết kế UNIQUE(user_id, specialty_id) của bản 3.0).
     */
    public record DoctorProfileView(String doctorId,
                                    String specialtyId,
                                    String specialtyName,
                                    String medicalCenterId,
                                    String medicalCenterName,
                                    String academicTitle,
                                    int experienceYears,
                                    BigDecimal consultationFee,
                                    String roomNumber,
                                    String bio,
                                    String avatarUrl) {
    }

    /** Hồ sơ người khám của chính chủ tài khoản (relationship = SELF). */
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

    /** Update Profile - phần thông tin tài khoản, dùng chung cho mọi vai trò. */
    public record UpdateProfileRequest(
            @NotBlank(message = "Họ tên không được để trống")
            @Size(max = 255, message = "Họ tên tối đa 255 ký tự")
            String fullName,

            @Pattern(regexp = "^$|^0[0-9]{8,10}$", message = "Số điện thoại phải bắt đầu bằng 0 và có 9-11 số")
            String phone) {
    }

    /** Change Password - dùng chung cho mọi vai trò. */
    public record ChangePasswordRequest(
            @NotBlank(message = "Mật khẩu hiện tại không được để trống")
            String currentPassword,

            @NotBlank(message = "Mật khẩu mới không được để trống")
            @Size(min = 8, max = 72, message = "Mật khẩu mới phải từ 8 đến 72 ký tự")
            String newPassword) {
    }

    /**
     * Doctor - Update Profile (phần chuyên môn). Cố ý KHÔNG cho bác sĩ tự sửa
     * {@code consultationFee} và {@code roomNumber}: giá khám và phòng khám do
     * phòng khám quyết định, thuộc quyền Admin.
     */
    public record UpdateDoctorProfileRequest(
            @Size(max = 100, message = "Học hàm/học vị tối đa 100 ký tự")
            String academicTitle,

            @Min(value = 0, message = "Số năm kinh nghiệm không được âm")
            @Max(value = 70, message = "Số năm kinh nghiệm không hợp lệ")
            int experienceYears,

            String bio,

            @Size(max = 500, message = "Đường dẫn ảnh tối đa 500 ký tự")
            String avatarUrl) {
    }

    /** Customer - Update Profile (phần hồ sơ y tế của chính chủ). */
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
