package com.medsched.admin;

import com.medsched.security.AppUserDetails;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Task 1 (phần mở rộng) - CRUD danh mục: cơ sở y tế, chuyên khoa, dịch vụ khám.
 * <p>
 * Xem danh sách: mọi tài khoản đã đăng nhập (bệnh nhân cần xem để chọn nơi khám).
 * Thêm/sửa/xóa: chỉ ROLE_ADMIN.
 */
@RestController
@RequestMapping("/api/v1")
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/medical-centers")
    public List<CatalogDtos.MedicalCenterResponse> listCenters() {
        return catalogService.listCenters();
    }

    @PostMapping("/admin/medical-centers")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CatalogDtos.MedicalCenterResponse> createCenter(
            @AuthenticationPrincipal AppUserDetails principal,
            @Valid @RequestBody CatalogDtos.MedicalCenterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(catalogService.createCenter(request, principal.getUserId()));
    }

    @PutMapping("/admin/medical-centers/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public CatalogDtos.MedicalCenterResponse updateCenter(@AuthenticationPrincipal AppUserDetails principal,
                                                          @PathVariable String id,
                                                          @Valid @RequestBody CatalogDtos.MedicalCenterRequest request) {
        return catalogService.updateCenter(id, request, principal.getUserId());
    }

    @DeleteMapping("/admin/medical-centers/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivateCenter(@AuthenticationPrincipal AppUserDetails principal,
                                                 @PathVariable String id) {
        catalogService.deactivateCenter(id, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/specialties")
    public List<CatalogDtos.SpecialtyResponse> listSpecialties(@RequestParam(required = false) String centerId) {
        return catalogService.listSpecialties(centerId);
    }

    @PostMapping("/admin/specialties")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CatalogDtos.SpecialtyResponse> createSpecialty(
            @AuthenticationPrincipal AppUserDetails principal,
            @Valid @RequestBody CatalogDtos.SpecialtyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(catalogService.createSpecialty(request, principal.getUserId()));
    }

    @PutMapping("/admin/specialties/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public CatalogDtos.SpecialtyResponse updateSpecialty(@AuthenticationPrincipal AppUserDetails principal,
                                                         @PathVariable String id,
                                                         @Valid @RequestBody CatalogDtos.SpecialtyRequest request) {
        return catalogService.updateSpecialty(id, request, principal.getUserId());
    }

    @DeleteMapping("/admin/specialties/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteSpecialty(@PathVariable String id) {
        catalogService.deleteSpecialty(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/services")
    public List<CatalogDtos.ServiceResponse> listServices(@RequestParam(required = false) String specialtyId) {
        return catalogService.listServices(specialtyId);
    }

    @PostMapping("/admin/services")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CatalogDtos.ServiceResponse> createService(
            @AuthenticationPrincipal AppUserDetails principal,
            @Valid @RequestBody CatalogDtos.ServiceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(catalogService.createService(request, principal.getUserId()));
    }

    @PutMapping("/admin/services/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public CatalogDtos.ServiceResponse updateService(@AuthenticationPrincipal AppUserDetails principal,
                                                     @PathVariable String id,
                                                     @Valid @RequestBody CatalogDtos.ServiceRequest request) {
        return catalogService.updateService(id, request, principal.getUserId());
    }

    @DeleteMapping("/admin/services/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivateService(@AuthenticationPrincipal AppUserDetails principal,
                                                  @PathVariable String id) {
        catalogService.deactivateService(id, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

}
