package com.medsched.account;

import com.medsched.security.AppUserDetails;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Task 1 - Update Profile & Change Password.
 * Dùng chung cho Customer / Doctor / Staff / Admin: mọi tài khoản đăng nhập đều
 * gọi được, nên không cần 4 bộ endpoint riêng cho 4 vai trò.
 */
@RestController
@RequestMapping("/api/v1/me")
public class MeController {

    private final AccountService accountService;

    public MeController(AccountService accountService) {
        this.accountService = accountService;
    }

    @GetMapping
    public AccountDtos.MeResponse me(@AuthenticationPrincipal AppUserDetails principal) {
        return accountService.me(principal);
    }

    @PutMapping
    public AccountDtos.MeResponse updateProfile(@AuthenticationPrincipal AppUserDetails principal,
                                                @Valid @RequestBody AccountDtos.UpdateProfileRequest request) {
        return accountService.updateProfile(principal, request);
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal AppUserDetails principal,
                                               @Valid @RequestBody AccountDtos.ChangePasswordRequest request) {
        accountService.changePassword(principal, request);
        return ResponseEntity.noContent().build();
    }

    /** Chỉ bác sĩ mới sửa được phần hồ sơ chuyên môn. */
    @PutMapping("/doctor-profile")
    @PreAuthorize("hasRole('DOCTOR')")
    public List<AccountDtos.DoctorProfileView> updateDoctorProfile(
            @AuthenticationPrincipal AppUserDetails principal,
            @Valid @RequestBody AccountDtos.UpdateDoctorProfileRequest request) {
        return accountService.updateDoctorProfile(principal, request);
    }

    /** Hồ sơ y tế của chính chủ tài khoản (mọi vai trò đều có thể là bệnh nhân). */
    @PutMapping("/patient-profile")
    public AccountDtos.PatientProfileView updatePatientProfile(
            @AuthenticationPrincipal AppUserDetails principal,
            @Valid @RequestBody AccountDtos.UpdatePatientProfileRequest request) {
        return accountService.updatePatientProfile(principal, request);
    }

}
