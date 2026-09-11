package com.medsched.admin;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** Hợp đồng dữ liệu cho CRUD danh mục: cơ sở y tế, chuyên khoa, dịch vụ khám. */
public final class CatalogDtos {

    private CatalogDtos() {
    }

    public record MedicalCenterResponse(String id, String code, String name, String address,
                                        String phone, boolean active) {
    }

    public record MedicalCenterRequest(
            @NotBlank(message = "Mã cơ sở không được để trống")
            @Size(max = 50, message = "Mã cơ sở tối đa 50 ký tự")
            String code,

            @NotBlank(message = "Tên cơ sở không được để trống")
            @Size(max = 255, message = "Tên cơ sở tối đa 255 ký tự")
            String name,

            @NotBlank(message = "Địa chỉ không được để trống")
            @Size(max = 500, message = "Địa chỉ tối đa 500 ký tự")
            String address,

            @Pattern(regexp = "^$|^0[0-9]{8,10}$", message = "Số điện thoại phải bắt đầu bằng 0 và có 9-11 số")
            String phone) {
    }

    public record SpecialtyResponse(String id, String medicalCenterId, String medicalCenterName,
                                    String name, String code, String description, String iconUrl) {
    }

    public record SpecialtyRequest(
            @NotBlank(message = "Phải chọn cơ sở y tế")
            String medicalCenterId,

            @NotBlank(message = "Tên chuyên khoa không được để trống")
            @Size(max = 255, message = "Tên chuyên khoa tối đa 255 ký tự")
            String name,

            @NotBlank(message = "Mã chuyên khoa không được để trống")
            @Size(max = 50, message = "Mã chuyên khoa tối đa 50 ký tự")
            String code,

            String description,

            @Size(max = 500, message = "Đường dẫn icon tối đa 500 ký tự")
            String iconUrl) {
    }

    public record ServiceResponse(String id, String specialtyId, String specialtyName, String name, String code,
                                  String description, BigDecimal price, int estimatedDurationMinutes,
                                  boolean active) {
    }

    public record ServiceRequest(
            @NotBlank(message = "Phải chọn chuyên khoa")
            String specialtyId,

            @NotBlank(message = "Tên dịch vụ không được để trống")
            @Size(max = 255, message = "Tên dịch vụ tối đa 255 ký tự")
            String name,

            @NotBlank(message = "Mã dịch vụ không được để trống")
            @Size(max = 50, message = "Mã dịch vụ tối đa 50 ký tự")
            String code,

            String description,

            @NotNull(message = "Phải nhập giá dịch vụ")
            @DecimalMin(value = "0.0", message = "Giá dịch vụ không được âm")
            BigDecimal price,

            @Min(value = 1, message = "Thời lượng phải lớn hơn 0 phút")
            @Max(value = 480, message = "Thời lượng tối đa 480 phút")
            int estimatedDurationMinutes) {
    }

}
