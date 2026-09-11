package com.medsched.admin;

import com.medsched.persistence.enums.UserRole;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Hợp đồng dữ liệu cho phân hệ quản trị người dùng (chỉ Admin gọi được). */
public final class AdminDtos {

    private AdminDtos() {
    }

    /** Một dòng trong danh sách người dùng. */
    public record UserSummary(String userId,
                              String email,
                              String fullName,
                              String phone,
                              boolean active,
                              List<RoleAssignment> roles,
                              Instant createdAt) {
    }

    /** Quyền nhân sự đã cấp tại một chi nhánh cụ thể. */
    public record RoleAssignment(String assignmentId,
                                 UserRole role,
                                 String medicalCenterId,
                                 String medicalCenterName,
                                 boolean active) {
    }

    public record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages) {
    }

    /** Admin tạo tài khoản Lễ tân. */
    public record CreateStaffRequest(
            @NotBlank(message = "Email không được để trống")
            @Email(message = "Email không đúng định dạng")
            String email,

            @NotBlank(message = "Mật khẩu không được để trống")
            @Size(min = 8, max = 72, message = "Mật khẩu phải từ 8 đến 72 ký tự")
            String password,

            @NotBlank(message = "Họ tên không được để trống")
            String fullName,

            @Pattern(regexp = "^$|^0[0-9]{8,10}$", message = "Số điện thoại phải bắt đầu bằng 0 và có 9-11 số")
            String phone,

            @NotBlank(message = "Phải chọn chi nhánh làm việc")
            String medicalCenterId) {
    }

    /**
     * Admin tạo tài khoản Bác sĩ. Không cần truyền chi nhánh: chi nhánh được suy
     * ra từ chuyên khoa, vì mỗi chuyên khoa đã thuộc đúng một cơ sở y tế.
     */
    public record CreateDoctorRequest(
            @NotBlank(message = "Email không được để trống")
            @Email(message = "Email không đúng định dạng")
            String email,

            @NotBlank(message = "Mật khẩu không được để trống")
            @Size(min = 8, max = 72, message = "Mật khẩu phải từ 8 đến 72 ký tự")
            String password,

            @NotBlank(message = "Họ tên không được để trống")
            String fullName,

            @Pattern(regexp = "^$|^0[0-9]{8,10}$", message = "Số điện thoại phải bắt đầu bằng 0 và có 9-11 số")
            String phone,

            @NotBlank(message = "Phải chọn chuyên khoa")
            String specialtyId,

            @Size(max = 100, message = "Học hàm/học vị tối đa 100 ký tự")
            String academicTitle,

            @Min(value = 0, message = "Số năm kinh nghiệm không được âm")
            int experienceYears,

            @NotNull(message = "Phải nhập giá khám")
            @DecimalMin(value = "0.0", message = "Giá khám không được âm")
            BigDecimal consultationFee,

            @Size(max = 50, message = "Số phòng tối đa 50 ký tự")
            String roomNumber) {
    }

    public record UpdateStatusRequest(@NotNull(message = "Phải chỉ định trạng thái") Boolean active) {
    }

    public record GrantRoleRequest(
            @NotNull(message = "Phải chọn vai trò")
            UserRole role,

            @NotBlank(message = "Phải chọn chi nhánh")
            String medicalCenterId) {
    }

}
