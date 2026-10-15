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
 * An authenticated user. Authorities follow the v3.0 database design:
 * <ul>
 *   <li>{@code ROLE_PATIENT} is granted to EVERY account, because being a
 *       patient is the default capability and is not stored in the staff
 *       role table.</li>
 *   <li>Each active {@code user_medical_center_roles} row yields two
 *       authorities: the plain one ({@code ROLE_STAFF}) for quick checks, and a
 *       branch-scoped one ({@code ROLE_STAFF@<centerId>}) so that later we can
 *       stop a receptionist of branch Q1 from touching branch Q7 data.</li>
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

    /** Authorities as plain strings, embedded in the JWT and returned to the client. */
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
