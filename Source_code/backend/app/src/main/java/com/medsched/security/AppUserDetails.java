package com.medsched.security;

import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.entity.UserMedicalCenterRoleEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * Người dùng đã xác thực. Quyền được dựng theo đúng thiết kế CSDL bản 3.0:
 * <ul>
 *   <li>{@code ROLE_PATIENT} luôn được cấp cho MỌI tài khoản — vì "bệnh nhân"
 *       là quyền mặc định, không lưu trong bảng quyền nhân sự.</li>
 *   <li>Mỗi dòng {@code user_medical_center_roles} đang hoạt động sinh ra 2
 *       quyền: quyền trơn ({@code ROLE_STAFF}) để kiểm tra nhanh, và quyền có
 *       phạm vi chi nhánh ({@code ROLE_STAFF@<centerId>}) để về sau chặn đúng
 *       việc "lễ tân chi nhánh Q1 không được sửa dữ liệu chi nhánh Q7".</li>
 * </ul>
 */
public class AppUserDetails implements UserDetails {

    public static final String ROLE_PATIENT = "ROLE_PATIENT";

    private final String userId;
    private final String email;
    private final String passwordHash;
    private final boolean active;
    private final List<GrantedAuthority> authorities;
    private final List<String> roleNames;

    public AppUserDetails(UserEntity user, List<UserMedicalCenterRoleEntity> roles) {
        this.userId = user.getId();
        this.email = user.getEmail();
        this.passwordHash = user.getPasswordHash();
        this.active = user.isActive();

        List<GrantedAuthority> granted = new ArrayList<>();
        List<String> names = new ArrayList<>();
        granted.add(new SimpleGrantedAuthority(ROLE_PATIENT));
        names.add(ROLE_PATIENT);
        for (UserMedicalCenterRoleEntity role : roles) {
            String plain = role.getRole().name();
            String scoped = plain + "@" + role.getMedicalCenterId();
            if (!names.contains(plain)) {
                granted.add(new SimpleGrantedAuthority(plain));
                names.add(plain);
            }
            granted.add(new SimpleGrantedAuthority(scoped));
            names.add(scoped);
        }
        this.authorities = List.copyOf(granted);
        this.roleNames = List.copyOf(names);
    }

    public String getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    /** Danh sách quyền dạng chuỗi để nhúng vào JWT và trả về cho client. */
    public List<String> getRoleNames() {
        return roleNames;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }

}
