package com.medsched.promotion;

import com.medsched.common.AppExceptions;
import com.medsched.persistence.entity.PromotionEntity;
import com.medsched.persistence.repository.PromotionJpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class PromotionService {

    private final PromotionJpaRepository promotionRepo;

    public PromotionService(PromotionJpaRepository promotionRepo) {
        this.promotionRepo = promotionRepo;
    }

    @Transactional(readOnly = true)
    public List<PromotionDtos.PromotionResponse> getAllPromotions() {
        return promotionRepo.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public PromotionDtos.PromotionResponse createPromotion(PromotionDtos.CreatePromotionRequest req, String userId) {
        String normalizedCode = req.code().trim().toUpperCase();
        if (promotionRepo.existsByCodeIgnoreCase(normalizedCode)) {
            throw new AppExceptions.ConflictException("Mã voucher '" + normalizedCode + "' đã tồn tại trên hệ thống.");
        }

        boolean active = req.status() == null || "active".equalsIgnoreCase(req.status());
        Instant now = Instant.now();

        PromotionEntity entity = new PromotionEntity(
                "promo-" + UUID.randomUUID().toString().substring(0, 8),
                normalizedCode,
                req.name().trim(),
                req.description(),
                req.discountType(),
                req.discountValue(),
                req.maxUses() != null ? req.maxUses() : 9999,
                0,
                req.startDate(),
                req.endDate(),
                req.targetAudience(),
                active,
                now,
                now
        );
        entity.setCreatedBy(userId);
        entity.setUpdatedBy(userId);

        PromotionEntity saved = promotionRepo.save(entity);
        return toResponse(saved);
    }

    public PromotionDtos.PromotionResponse updatePromotion(String id, PromotionDtos.UpdatePromotionRequest req, String userId) {
        PromotionEntity entity = promotionRepo.findById(id)
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy mã ưu đãi với ID: " + id));

        boolean active = req.status() == null || "active".equalsIgnoreCase(req.status());

        entity.setName(req.name().trim());
        entity.setDescription(req.description());
        entity.setDiscountType(req.discountType());
        entity.setDiscountValue(req.discountValue());
        entity.setMaxUses(req.maxUses() != null ? req.maxUses() : 9999);
        entity.setStartDate(req.startDate());
        entity.setEndDate(req.endDate());
        entity.setTargetAudience(req.targetAudience());
        entity.setActive(active);
        entity.setUpdatedAt(Instant.now());
        entity.setUpdatedBy(userId);

        PromotionEntity saved = promotionRepo.save(entity);
        return toResponse(saved);
    }

    public void deletePromotion(String id) {
        if (!promotionRepo.existsById(id)) {
            throw new AppExceptions.NotFoundException("Không tìm thấy mã ưu đãi với ID: " + id);
        }
        promotionRepo.deleteById(id);
    }

    public PromotionDtos.PromotionResponse toggleStatus(String id) {
        PromotionEntity entity = promotionRepo.findById(id)
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy mã ưu đãi với ID: " + id));

        entity.setActive(!entity.isActive());
        entity.setUpdatedAt(Instant.now());

        PromotionEntity saved = promotionRepo.save(entity);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public PromotionDtos.ValidatePromotionResponse validatePromotion(String rawCode) {
        if (rawCode == null || rawCode.isBlank()) {
            return new PromotionDtos.ValidatePromotionResponse(false, "Vui lòng nhập mã voucher", null, null, null, BigDecimal.ZERO, false);
        }
        String normalizedCode = rawCode.trim().toUpperCase();
        var opt = promotionRepo.findByCodeIgnoreCase(normalizedCode);
        if (opt.isEmpty()) {
            return new PromotionDtos.ValidatePromotionResponse(false, "Mã voucher không tồn tại trên hệ thống", normalizedCode, null, null, BigDecimal.ZERO, false);
        }

        PromotionEntity p = opt.get();
        LocalDate today = LocalDate.now();

        if (!p.isActive()) {
            return new PromotionDtos.ValidatePromotionResponse(false, "Mã voucher đang tạm dừng áp dụng", normalizedCode, p.getName(), p.getDiscountType(), p.getDiscountValue(), false);
        }
        if (p.getStartDate() != null && today.isBefore(p.getStartDate())) {
            return new PromotionDtos.ValidatePromotionResponse(false, "Mã voucher chưa đến thời gian áp dụng", normalizedCode, p.getName(), p.getDiscountType(), p.getDiscountValue(), false);
        }
        if (p.getEndDate() != null && today.isAfter(p.getEndDate())) {
            return new PromotionDtos.ValidatePromotionResponse(false, "Mã voucher đã hết hạn sử dụng", normalizedCode, p.getName(), p.getDiscountType(), p.getDiscountValue(), false);
        }
        if (p.getMaxUses() != null && p.getUsedCount() >= p.getMaxUses()) {
            return new PromotionDtos.ValidatePromotionResponse(false, "Mã voucher đã hết lượt sử dụng", normalizedCode, p.getName(), p.getDiscountType(), p.getDiscountValue(), false);
        }

        boolean isFree = "FREE_DEPOSIT".equalsIgnoreCase(p.getDiscountType()) ||
                ("PERCENT".equalsIgnoreCase(p.getDiscountType()) && p.getDiscountValue().compareTo(BigDecimal.valueOf(100)) >= 0);

        return new PromotionDtos.ValidatePromotionResponse(true, "Áp dụng mã thành công: " + p.getName(), normalizedCode, p.getName(), p.getDiscountType(), p.getDiscountValue(), isFree);
    }

    private PromotionDtos.PromotionResponse toResponse(PromotionEntity p) {
        return new PromotionDtos.PromotionResponse(
                p.getId(),
                p.getCode(),
                p.getName(),
                p.getDescription(),
                p.getDiscountType(),
                p.getDiscountValue(),
                p.getMaxUses(),
                p.getUsedCount(),
                p.getStartDate() != null ? p.getStartDate().toString() : "",
                p.getEndDate() != null ? p.getEndDate().toString() : "",
                p.isActive() ? "active" : "inactive",
                p.getTargetAudience(),
                p.getCreatedAt() != null ? p.getCreatedAt().toString() : ""
        );
    }
}
