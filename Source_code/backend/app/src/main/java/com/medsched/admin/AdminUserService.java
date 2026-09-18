package com.medsched.admin;

import com.medsched.common.AppExceptions;
import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.entity.MedicalCenterEntity;
import com.medsched.persistence.entity.SpecialtyEntity;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.entity.UserMedicalCenterRoleEntity;
import com.medsched.persistence.enums.UserRole;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.MedicalCenterJpaRepository;
import com.medsched.persistence.repository.SpecialtyJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import com.medsched.persistence.repository.UserMedicalCenterRoleJpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Admin - manage users by role and create receptionist and doctor accounts. */
@Service
public class AdminUserService {

    /** Allow-list of sortable fields, so sensitive columns cannot be exposed. */
    private static final List<String> SORTABLE_FIELDS =
            List.of("createdAt", "updatedAt", "email", "fullName", "active");

    private final UserJpaRepository users;
    private final UserMedicalCenterRoleJpaRepository roles;
    private final DoctorJpaRepository doctors;
    private final SpecialtyJpaRepository specialties;
    private final MedicalCenterJpaRepository medicalCenters;
    private final PasswordEncoder passwordEncoder;

    public AdminUserService(UserJpaRepository users,
                            UserMedicalCenterRoleJpaRepository roles,
                            DoctorJpaRepository doctors,
                            SpecialtyJpaRepository specialties,
                            MedicalCenterJpaRepository medicalCenters,
                            PasswordEncoder passwordEncoder) {
        this.users = users;
        this.roles = roles;
        this.doctors = doctors;
        this.specialties = specialties;
        this.medicalCenters = medicalCenters;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Lists users, optionally filtered by role.
     *
     * @param role     null = everyone; CUSTOMER = accounts with no staff role
     * @param centerId only applies when filtering by a staff role
     */
    @Transactional(readOnly = true)
    public AdminDtos.PageResponse<AdminDtos.UserSummary> list(String role, String centerId, String keyword,
                                                              int page, int size, String sort) {
        String q = "%" + (keyword == null ? "" : keyword.trim().toLowerCase()) + "%";
        var pageable = PageRequest.of(Math.max(page, 0), size <= 0 || size > 100 ? 20 : size, parseSort(sort));

        Page<UserEntity> result;
        if (role == null || role.isBlank() || "ALL".equalsIgnoreCase(role)) {
            result = users.search(q, pageable);
        } else if ("CUSTOMER".equalsIgnoreCase(role) || "ROLE_PATIENT".equalsIgnoreCase(role)) {
            result = users.searchCustomers(q, pageable);
        } else {
            result = users.searchByRole(q, parseRole(role), blankToNull(centerId), pageable);
        }

        List<AdminDtos.UserSummary> items = new ArrayList<>();
        for (UserEntity user : result.getContent()) {
            items.add(toSummary(user));
        }
        return new AdminDtos.PageResponse<>(items, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public AdminDtos.UserSummary detail(String userId) {
        return toSummary(requireUser(userId));
    }

    /** Creates a receptionist account and grants ROLE_STAFF at the right branch. */
    @Transactional
    public AdminDtos.UserSummary createStaff(AdminDtos.CreateStaffRequest request, String actorId) {
        MedicalCenterEntity center = medicalCenters.findById(request.medicalCenterId())
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy chi nhánh"));
        UserEntity user = createUser(request.email(), request.password(), request.fullName(), request.phone(), actorId);
        grantRole(user.getId(), center.getId(), UserRole.ROLE_STAFF, actorId);
        return toSummary(user);
    }

    /**
     * Creates a doctor account: one users row + one ROLE_DOCTOR grant + one
     * doctors profile. The branch comes from the specialty, so a doctor can never
     * be attached to a branch that does not offer that specialty.
     */
    @Transactional
    public AdminDtos.UserSummary createDoctor(AdminDtos.CreateDoctorRequest request, String actorId) {
        SpecialtyEntity specialty = specialties.findById(request.specialtyId())
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy chuyên khoa"));

        UserEntity user = createUser(request.email(), request.password(), request.fullName(), request.phone(), actorId);
        grantRole(user.getId(), specialty.getMedicalCenterId(), UserRole.ROLE_DOCTOR, actorId);

        Instant now = Instant.now();
        DoctorEntity doctor = new DoctorEntity(UUID.randomUUID().toString(), user.getId(), specialty.getId(),
                blankToNull(request.academicTitle()), request.consultationFee(),
                blankToNull(request.roomNumber()), null, null, now, now);
        doctor.setCreatedBy(actorId);
        doctor.setUpdatedBy(actorId);
        doctors.save(doctor);
        return toSummary(user);
    }

    /** Locks / unlocks an account. A locked account can no longer sign in. */
    @Transactional
    public AdminDtos.UserSummary updateStatus(String userId, boolean active, String actorId) {
        UserEntity user = requireUser(userId);
        if (user.getId().equals(actorId) && !active) {
            throw new AppExceptions.BadRequestException("Không thể tự khóa tài khoản của chính mình");
        }
        user.setActive(active);
        user.setUpdatedAt(Instant.now());
        user.setUpdatedBy(actorId);
        users.save(user);
        return toSummary(user);
    }

    /** Admin resets password for a user. */
    @Transactional
    public AdminDtos.UserSummary resetPassword(String userId, String newPassword, String actorId) {
        UserEntity user = requireUser(userId);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(Instant.now());
        user.setUpdatedBy(actorId);
        users.save(user);
        return toSummary(user);
    }

    /** Grants an additional staff role to an existing account at a branch. */
    @Transactional
    public AdminDtos.UserSummary grantRole(String userId, AdminDtos.GrantRoleRequest request, String actorId) {
        UserEntity user = requireUser(userId);
        medicalCenters.findById(request.medicalCenterId())
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy chi nhánh"));
        grantRole(user.getId(), request.medicalCenterId(), request.role(), actorId);
        return toSummary(user);
    }

    /**
     * Revoking a role sets is_active = false instead of deleting the row, so the
     * history of who worked at which branch remains auditable.
     */
    @Transactional
    public AdminDtos.UserSummary revokeRole(String userId, String assignmentId, String actorId) {
        UserEntity user = requireUser(userId);
        UserMedicalCenterRoleEntity assignment = roles.findById(assignmentId)
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy quyền cần thu hồi"));
        if (!assignment.getUserId().equals(userId)) {
            throw new AppExceptions.BadRequestException("Quyền này không thuộc tài khoản đã chọn");
        }
        assignment.setActive(false);
        assignment.setUpdatedAt(Instant.now());
        assignment.setUpdatedBy(actorId);
        roles.save(assignment);
        return toSummary(user);
    }

    private UserEntity createUser(String email, String rawPassword, String fullName, String phone, String actorId) {
        String normalized = email.trim().toLowerCase();
        if (users.existsByEmail(normalized)) {
            throw new AppExceptions.ConflictException("Email này đã được đăng ký");
        }
        Instant now = Instant.now();
        UserEntity user = new UserEntity(UUID.randomUUID().toString(), normalized,
                passwordEncoder.encode(rawPassword), fullName.trim(), blankToNull(phone), true, now, now);
        user.setCreatedBy(actorId);
        user.setUpdatedBy(actorId);
        return users.save(user);
    }

    private void grantRole(String userId, String centerId, UserRole role, String actorId) {
        if (roles.existsByUserIdAndMedicalCenterIdAndRoleAndActiveTrue(userId, centerId, role)) {
            throw new AppExceptions.ConflictException("Tài khoản đã có quyền này tại chi nhánh đã chọn");
        }
        Instant now = Instant.now();
        UserMedicalCenterRoleEntity assignment = new UserMedicalCenterRoleEntity(
                UUID.randomUUID().toString(), userId, centerId, role, now, now);
        assignment.setCreatedBy(actorId);
        assignment.setUpdatedBy(actorId);
        roles.save(assignment);
    }

    private AdminDtos.UserSummary toSummary(UserEntity user) {
        List<AdminDtos.RoleAssignment> assignments = new ArrayList<>();
        for (UserMedicalCenterRoleEntity role : roles.findByUserIdAndActiveTrue(user.getId())) {
            String centerName = medicalCenters.findById(role.getMedicalCenterId())
                    .map(center -> center.getName()).orElse(null);
            assignments.add(new AdminDtos.RoleAssignment(role.getId(), role.getRole(),
                    role.getMedicalCenterId(), centerName, role.isActive()));
        }
        return new AdminDtos.UserSummary(user.getId(), user.getEmail(), user.getFullName(), user.getPhone(),
                user.isActive(), assignments, user.getCreatedAt());
    }

    private UserEntity requireUser(String userId) {
        return users.findById(userId)
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy tài khoản"));
    }

    /**
     * Turns a "field,direction" sort parameter (e.g. "fullName,asc") into a
     * {@link Sort}. Only allow-listed fields are accepted, so callers cannot sort
     * by a sensitive column such as passwordHash or break the query.
     */
    private static Sort parseSort(String sort) {
        Sort defaultSort = Sort.by(Sort.Direction.DESC, "createdAt");
        if (sort == null || sort.isBlank()) {
            return defaultSort;
        }
        String[] parts = sort.split(",");
        String field = parts[0].trim();
        if (!SORTABLE_FIELDS.contains(field)) {
            throw new AppExceptions.BadRequestException(
                    "Không sắp xếp được theo trường '" + field + "'. Chỉ nhận: " + String.join(", ", SORTABLE_FIELDS));
        }
        Sort.Direction direction = parts.length > 1 && "desc".equalsIgnoreCase(parts[1].trim())
                ? Sort.Direction.DESC
                : Sort.Direction.ASC;
        return Sort.by(direction, field);
    }

    private static UserRole parseRole(String role) {
        try {
            String value = role.trim().toUpperCase();
            return UserRole.valueOf(value.startsWith("ROLE_") ? value : "ROLE_" + value);
        } catch (IllegalArgumentException ex) {
            throw new AppExceptions.BadRequestException(
                    "Vai trò không hợp lệ. Chỉ nhận: ALL, CUSTOMER, ROLE_DOCTOR, ROLE_STAFF, ROLE_ADMIN");
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

}
