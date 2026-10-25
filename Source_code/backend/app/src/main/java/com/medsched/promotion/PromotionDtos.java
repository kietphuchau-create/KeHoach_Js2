package com.medsched.promotion;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public class PromotionDtos {

    public record PromotionResponse(
            String id,
            String code,
            String name,
            String description,
            String discountType,
            BigDecimal discountValue,
            Integer maxUses,
            int usedCount,
            String startDate,
            String endDate,
            String status, // "active" | "inactive"
            String targetAudience,
            String createdAt
    ) {}

    public record CreatePromotionRequest(
            @NotBlank(message = "Mã voucher không được để trống")
            String code,
            @NotBlank(message = "Tên chương trình không được để trống")
            String name,
            String description,
            @NotBlank(message = "Loại giảm giá không được để trống")
            String discountType,
            @NotNull(message = "Giá trị giảm không được để trống")
            BigDecimal discountValue,
            Integer maxUses,
            @NotNull(message = "Ngày bắt đầu không được để trống")
            LocalDate startDate,
            @NotNull(message = "Ngày kết thúc không được để trống")
            LocalDate endDate,
            String targetAudience,
            String status
    ) {}

    public record UpdatePromotionRequest(
            @NotBlank(message = "Tên chương trình không được để trống")
            String name,
            String description,
            @NotBlank(message = "Loại giảm giá không được để trống")
            String discountType,
            @NotNull(message = "Giá trị giảm không được để trống")
            BigDecimal discountValue,
            Integer maxUses,
            @NotNull(message = "Ngày bắt đầu không được để trống")
            LocalDate startDate,
            @NotNull(message = "Ngày kết thúc không được để trống")
            LocalDate endDate,
            String targetAudience,
            String status
    ) {}

    public record ValidatePromotionResponse(
            boolean valid,
            String message,
            String code,
            String name,
            String discountType,
            BigDecimal discountValue,
            boolean isFree
    ) {}
}
