package com.medsched;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Điểm khởi động ứng dụng MedSched.
 * Nằm ở gói gốc com.medsched để component scan bao trọn:
 * - auth, account, admin (Task 1)
 * - security, common
 * - persistence (17 JPA Entities & Repositories)
 * - app (adapters, use cases config, controllers)
 */
@SpringBootApplication
public class MedSchedApplication {

    public static void main(String[] args) {
        SpringApplication.run(MedSchedApplication.class, args);
    }
}
