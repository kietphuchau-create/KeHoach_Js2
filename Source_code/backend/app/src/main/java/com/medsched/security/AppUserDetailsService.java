package com.medsched.security;

import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.repository.UserJpaRepository;
import com.medsched.persistence.repository.UserMedicalCenterRoleJpaRepository;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AppUserDetailsService implements UserDetailsService {

    private final UserJpaRepository users;
    private final UserMedicalCenterRoleJpaRepository roles;

    public AppUserDetailsService(UserJpaRepository users, UserMedicalCenterRoleJpaRepository roles) {
        this.users = users;
        this.roles = roles;
    }

    @Override
    @Transactional(readOnly = true)
    public AppUserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        String clean = identifier != null ? identifier.trim() : "";
        UserEntity user = users.findByEmail(clean.toLowerCase()).orElse(null);
        if (user == null) {
            String phone = clean.replaceAll("[\\s.-]", "");
            if (phone.startsWith("+84")) {
                phone = "0" + phone.substring(3);
            } else if (phone.startsWith("84") && phone.length() == 11) {
                phone = "0" + phone.substring(2);
            }
            user = users.findByPhone(phone).orElse(null);
        }
        if (user == null) {
            throw new UsernameNotFoundException("Không tìm thấy tài khoản: " + identifier);
        }
        return new AppUserDetails(user, roles.findByUserIdAndActiveTrue(user.getId()));
    }

    @Transactional(readOnly = true)
    public AppUserDetails loadUserById(String userId) throws UsernameNotFoundException {
        UserEntity user = users.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy tài khoản id: " + userId));
        return new AppUserDetails(user, roles.findByUserIdAndActiveTrue(user.getId()));
    }

}
