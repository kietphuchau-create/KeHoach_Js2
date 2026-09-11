package com.medsched.admin;

import com.medsched.security.AppUserDetails;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Task 1 - Admin: quản lý chung các user theo role, tạo tài khoản Staff/Doctor.
 * Toàn bộ endpoint trong lớp này yêu cầu quyền ROLE_ADMIN.
 */
@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    /** role: ALL | CUSTOMER | ROLE_DOCTOR | ROLE_STAFF | ROLE_ADMIN. */
    @GetMapping
    public AdminDtos.PageResponse<AdminDtos.UserSummary> list(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String centerId,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return adminUserService.list(role, centerId, q, page, size);
    }

    @GetMapping("/{userId}")
    public AdminDtos.UserSummary detail(@PathVariable String userId) {
        return adminUserService.detail(userId);
    }

    @PostMapping("/staff")
    public ResponseEntity<AdminDtos.UserSummary> createStaff(
            @AuthenticationPrincipal AppUserDetails principal,
            @Valid @RequestBody AdminDtos.CreateStaffRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminUserService.createStaff(request, principal.getUserId()));
    }

    @PostMapping("/doctors")
    public ResponseEntity<AdminDtos.UserSummary> createDoctor(
            @AuthenticationPrincipal AppUserDetails principal,
            @Valid @RequestBody AdminDtos.CreateDoctorRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminUserService.createDoctor(request, principal.getUserId()));
    }

    /** Khóa / mở khóa tài khoản. */
    @PatchMapping("/{userId}/status")
    public AdminDtos.UserSummary updateStatus(@AuthenticationPrincipal AppUserDetails principal,
                                              @PathVariable String userId,
                                              @Valid @RequestBody AdminDtos.UpdateStatusRequest request) {
        return adminUserService.updateStatus(userId, request.active(), principal.getUserId());
    }

    /** Cấp thêm quyền nhân sự tại một chi nhánh. */
    @PostMapping("/{userId}/roles")
    public AdminDtos.UserSummary grantRole(@AuthenticationPrincipal AppUserDetails principal,
                                           @PathVariable String userId,
                                           @Valid @RequestBody AdminDtos.GrantRoleRequest request) {
        return adminUserService.grantRole(userId, request, principal.getUserId());
    }

    @DeleteMapping("/{userId}/roles/{assignmentId}")
    public AdminDtos.UserSummary revokeRole(@AuthenticationPrincipal AppUserDetails principal,
                                            @PathVariable String userId,
                                            @PathVariable String assignmentId) {
        return adminUserService.revokeRole(userId, assignmentId, principal.getUserId());
    }

}
