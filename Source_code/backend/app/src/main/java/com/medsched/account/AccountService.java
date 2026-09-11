package com.medsched.account;

import com.medsched.common.AppExceptions;
import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.entity.PatientProfileEntity;
import com.medsched.persistence.entity.SpecialtyEntity;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.enums.RelationshipType;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.MedicalCenterJpaRepository;
import com.medsched.persistence.repository.PatientProfileJpaRepository;
import com.medsched.persistence.repository.SpecialtyJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import com.medsched.security.AppUserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Nghiệp vụ tài khoản cá nhân: xem hồ sơ, cập nhật hồ sơ, đổi mật khẩu. */
@Service
public class AccountService {

    private final UserJpaRepository users;
    private final PatientProfileJpaRepository patientProfiles;
    private final DoctorJpaRepository doctors;
    private final SpecialtyJpaRepository specialties;
    private final MedicalCenterJpaRepository medicalCenters;
    private final PasswordEncoder passwordEncoder;

    public AccountService(UserJpaRepository users,
                          PatientProfileJpaRepository patientProfiles,
                          DoctorJpaRepository doctors,
                          SpecialtyJpaRepository specialties,
                          MedicalCenterJpaRepository medicalCenters,
                          PasswordEncoder passwordEncoder) {
        this.users = users;
        this.patientProfiles = patientProfiles;
        this.doctors = doctors;
        this.specialties = specialties;
        this.medicalCenters = medicalCenters;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public AccountDtos.MeResponse me(AppUserDetails principal) {
        UserEntity user = requireUser(principal.getUserId());
        return new AccountDtos.MeResponse(
                user.getId(), user.getEmail(), user.getFullName(), user.getPhone(), user.isActive(),
                principal.getRoleNames(), doctorProfilesOf(user.getId()), selfProfileView(user.getId()));
    }

    @Transactional
    public AccountDtos.MeResponse updateProfile(AppUserDetails principal, AccountDtos.UpdateProfileRequest request) {
        UserEntity user = requireUser(principal.getUserId());
        user.setFullName(request.fullName().trim());
        user.setPhone(blankToNull(request.phone()));
        touch(user, principal.getUserId());
        users.save(user);
        return me(principal);
    }

    @Transactional
    public void changePassword(AppUserDetails principal, AccountDtos.ChangePasswordRequest request) {
        UserEntity user = requireUser(principal.getUserId());
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new AppExceptions.BadRequestException("Mật khẩu hiện tại không đúng");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new AppExceptions.BadRequestException("Mật khẩu mới phải khác mật khẩu hiện tại");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        touch(user, principal.getUserId());
        users.save(user);
    }

    /**
     * Doctor - Update Profile. Học vị/kinh nghiệm/tiểu sử là thông tin của con
     * người nên áp dụng cho TẤT CẢ hồ sơ hành nghề của tài khoản này (bác sĩ
     * trực 2 chi nhánh thì cả 2 hồ sơ cùng được cập nhật).
     */
    @Transactional
    public List<AccountDtos.DoctorProfileView> updateDoctorProfile(AppUserDetails principal,
                                                                   AccountDtos.UpdateDoctorProfileRequest request) {
        List<DoctorEntity> profiles = doctors.findByUserId(principal.getUserId());
        if (profiles.isEmpty()) {
            throw new AppExceptions.NotFoundException("Tài khoản này chưa có hồ sơ bác sĩ");
        }
        for (DoctorEntity doctor : profiles) {
            doctor.setAcademicTitle(blankToNull(request.academicTitle()));
            doctor.setExperienceYears(request.experienceYears());
            doctor.setBio(blankToNull(request.bio()));
            doctor.setAvatarUrl(blankToNull(request.avatarUrl()));
            doctor.setUpdatedAt(Instant.now());
            doctor.setUpdatedBy(principal.getUserId());
        }
        doctors.saveAll(profiles);
        return doctorProfilesOf(principal.getUserId());
    }

    /** Customer - Update Profile (hồ sơ y tế của chính chủ, tạo mới nếu chưa có). */
    @Transactional
    public AccountDtos.PatientProfileView updatePatientProfile(AppUserDetails principal,
                                                               AccountDtos.UpdatePatientProfileRequest request) {
        Instant now = Instant.now();
        PatientProfileEntity profile = patientProfiles
                .findByUserIdAndRelationship(principal.getUserId(), RelationshipType.SELF)
                .orElseGet(() -> new PatientProfileEntity(UUID.randomUUID().toString(), principal.getUserId(),
                        RelationshipType.SELF, request.fullName().trim(),
                        null, null, null, null, null, null, null, now, now));

        profile.setFullName(request.fullName().trim());
        profile.setCccdNumber(blankToNull(request.cccdNumber()));
        profile.setHealthInsuranceNo(blankToNull(request.healthInsuranceNo()));
        profile.setDateOfBirth(request.dateOfBirth());
        profile.setGender(request.gender());
        profile.setPhone(blankToNull(request.phone()));
        profile.setAddress(blankToNull(request.address()));
        profile.setMedicalHistory(blankToNull(request.medicalHistory()));
        profile.setUpdatedAt(now);
        profile.setUpdatedBy(principal.getUserId());
        patientProfiles.save(profile);
        return toView(profile);
    }

    private List<AccountDtos.DoctorProfileView> doctorProfilesOf(String userId) {
        List<AccountDtos.DoctorProfileView> views = new ArrayList<>();
        for (DoctorEntity doctor : doctors.findByUserId(userId)) {
            SpecialtyEntity specialty = specialties.findById(doctor.getSpecialtyId()).orElse(null);
            String centerId = specialty == null ? null : specialty.getMedicalCenterId();
            String centerName = centerId == null ? null
                    : medicalCenters.findById(centerId).map(center -> center.getName()).orElse(null);
            views.add(new AccountDtos.DoctorProfileView(
                    doctor.getId(), doctor.getSpecialtyId(),
                    specialty == null ? null : specialty.getName(),
                    centerId, centerName,
                    doctor.getAcademicTitle(), doctor.getExperienceYears(), doctor.getConsultationFee(),
                    doctor.getRoomNumber(), doctor.getBio(), doctor.getAvatarUrl()));
        }
        return views;
    }

    private AccountDtos.PatientProfileView selfProfileView(String userId) {
        return patientProfiles.findByUserIdAndRelationship(userId, RelationshipType.SELF)
                .map(this::toView).orElse(null);
    }

    private AccountDtos.PatientProfileView toView(PatientProfileEntity profile) {
        return new AccountDtos.PatientProfileView(profile.getId(), profile.getFullName(), profile.getCccdNumber(),
                profile.getHealthInsuranceNo(), profile.getDateOfBirth(), profile.getGender(), profile.getPhone(),
                profile.getAddress(), profile.getMedicalHistory());
    }

    private UserEntity requireUser(String userId) {
        return users.findById(userId)
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy tài khoản"));
    }

    private static void touch(UserEntity user, String actorId) {
        user.setUpdatedAt(Instant.now());
        user.setUpdatedBy(actorId);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

}
