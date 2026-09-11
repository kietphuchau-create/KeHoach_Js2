package com.medsched.persistence.enums;

/** Staff privileges scoped to a medical center; every active user may book as a patient. */
public enum UserRole {
    ROLE_DOCTOR,
    ROLE_STAFF,
    ROLE_ADMIN
}
