package com.medsched.promotion;

import com.medsched.security.AppUserDetails;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/admin/promotions", "/api/admin/promotions"})
public class PromotionController {

    private final PromotionService promotionService;

    public PromotionController(PromotionService promotionService) {
        this.promotionService = promotionService;
    }

    /**
     * Lấy danh sách toàn bộ mã khuyến mãi từ CSDL MySQL (mới nhất lên đầu).
     */
    @GetMapping
    public ResponseEntity<List<PromotionDtos.PromotionResponse>> getAllPromotions() {
        return ResponseEntity.ok(promotionService.getAllPromotions());
    }

    /**
     * Tạo mã khuyến mãi mới vào MySQL.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<PromotionDtos.PromotionResponse> createPromotion(
            @Valid @RequestBody PromotionDtos.CreatePromotionRequest request,
            @AuthenticationPrincipal AppUserDetails principal) {
        String userId = principal != null ? principal.getUserId() : null;
        PromotionDtos.PromotionResponse response = promotionService.createPromotion(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Cập nhật thông tin mã khuyến mãi trong MySQL.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<PromotionDtos.PromotionResponse> updatePromotion(
            @PathVariable String id,
            @Valid @RequestBody PromotionDtos.UpdatePromotionRequest request,
            @AuthenticationPrincipal AppUserDetails principal) {
        String userId = principal != null ? principal.getUserId() : null;
        PromotionDtos.PromotionResponse response = promotionService.updatePromotion(id, request, userId);
        return ResponseEntity.ok(response);
    }

    /**
     * Xóa mã khuyến mãi khỏi MySQL.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<Void> deletePromotion(@PathVariable String id) {
        promotionService.deletePromotion(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Đổi trạng thái Bật / Tắt mã (active / inactive).
     */
    @PatchMapping("/{id}/toggle")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<PromotionDtos.PromotionResponse> toggleStatus(@PathVariable String id) {
        PromotionDtos.PromotionResponse response = promotionService.toggleStatus(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Kiểm tra tính hợp lệ của mã voucher khi đặt khám.
     */
    @GetMapping("/validate")
    public ResponseEntity<PromotionDtos.ValidatePromotionResponse> validatePromotion(
            @RequestParam String code) {
        return ResponseEntity.ok(promotionService.validatePromotion(code));
    }
}
