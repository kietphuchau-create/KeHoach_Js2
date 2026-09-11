package com.medsched;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Điểm khởi động ứng dụng MedSched.
 * <p>
 * Nằm ở gói gốc {@code com.medsched} để component scan bao trọn cả tầng
 * persistence ({@code com.medsched.persistence}) lẫn các tầng của Task 1
 * ({@code security}, {@code auth}, {@code account}, {@code admin}).
 */
@SpringBootApplication
public class MedSchedApplication {

    public static void main(String[] args) {
        SpringApplication.run(MedSchedApplication.class, args);
    }

}
