package com.medsched.core.domain.model;

/**
 * Domain Model đại diện cho thông tin tài khoản người dùng trong Core.
 * Hoàn toàn là Pure Java record, không phụ thuộc vào Spring Framework hay JPA Hibernate.
 */
public record AccountUser(
        String id,
        String email,
        String fullName,
        String phone,
        String passwordHash,
        boolean active
) {}
