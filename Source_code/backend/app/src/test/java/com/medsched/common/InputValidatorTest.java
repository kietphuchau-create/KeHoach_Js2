package com.medsched.common;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class InputValidatorTest {

    @Test
    @DisplayName("Validate Phone: Hợp lệ với đầu 0 hoặc +84")
    void testValidatePhone_Success() {
        assertEquals("0912345678", InputValidator.validatePhone("0912345678"));
        assertEquals("0389123456", InputValidator.validatePhone("+84389123456"));
        assertEquals("0778123456", InputValidator.validatePhone("84778123456"));
    }

    @Test
    @DisplayName("Validate Phone: Thất bại khi chứa chữ cái hoặc ký tự đặc biệt")
    void testValidatePhone_InvalidChars() {
        assertThrows(IllegalArgumentException.class, () -> InputValidator.validatePhone("091234567a"));
        assertThrows(IllegalArgumentException.class, () -> InputValidator.validatePhone("091234@678"));
        assertThrows(IllegalArgumentException.class, () -> InputValidator.validatePhone("09123 45678"));
        assertThrows(IllegalArgumentException.class, () -> InputValidator.validatePhone("0123456789")); // đầu 01 không thuộc mạng VN
    }

    @Test
    @DisplayName("Validate FullName: Hợp lệ với tiếng Việt có dấu và khoảng trắng")
    void testValidateFullName_Success() {
        assertEquals("Nguyễn Văn An", InputValidator.validateFullName("Nguyễn Văn An"));
        assertEquals("Trần Thị Ánh Tuyết", InputValidator.validateFullName("  Trần   Thị Ánh Tuyết  "));
        assertEquals("Lê Đức Đạt", InputValidator.validateFullName("Lê Đức Đạt"));
    }

    @Test
    @DisplayName("Validate FullName: Thất bại khi chứa số hoặc ký tự đặc biệt")
    void testValidateFullName_InvalidChars() {
        assertThrows(IllegalArgumentException.class, () -> InputValidator.validateFullName("Nguyễn Văn 123"));
        assertThrows(IllegalArgumentException.class, () -> InputValidator.validateFullName("Trần @Ánh"));
        assertThrows(IllegalArgumentException.class, () -> InputValidator.validateFullName("A")); // quá ngắn
    }

    @Test
    @DisplayName("Validate Email: Hợp lệ với các chuẩn Gmail/Email")
    void testValidateEmail_Success() {
        assertEquals("nguyenvana@gmail.com", InputValidator.validateEmail("nguyenvana@gmail.com"));
        assertEquals("bacsi.tuan@bv-med.com.vn", InputValidator.validateEmail("bacsi.tuan@bv-med.com.vn"));
        assertNull(InputValidator.validateEmail(null));
        assertNull(InputValidator.validateEmail(""));
    }

    @Test
    @DisplayName("Validate Email: Thất bại khi chứa ký tự cấm, khoảng trắng hoặc hai dấu chấm liên tiếp")
    void testValidateEmail_Invalid() {
        assertThrows(IllegalArgumentException.class, () -> InputValidator.validateEmail("nguyen van a@gmail.com"));
        assertThrows(IllegalArgumentException.class, () -> InputValidator.validateEmail("nguyen..a@gmail.com"));
        assertThrows(IllegalArgumentException.class, () -> InputValidator.validateEmail("test<script>@gmail.com"));
        assertThrows(IllegalArgumentException.class, () -> InputValidator.validateEmail("test@gmail"));
    }

    @Test
    @DisplayName("Validate Symptoms: Chặn XSS / Script Injection")
    void testValidateSymptoms() {
        assertEquals("Sốt 2 ngày, ho nhẹ", InputValidator.validateSymptoms("Sốt 2 ngày, ho nhẹ"));
        assertThrows(IllegalArgumentException.class, () -> InputValidator.validateSymptoms("Sốt <script>alert(1)</script>"));
        assertThrows(IllegalArgumentException.class, () -> InputValidator.validateSymptoms("Đau bụng {inject}"));
    }

    @Test
    @DisplayName("Validate CCCD: 12 chữ số")
    void testValidateCccd() {
        assertEquals("079203001234", InputValidator.validateCccd("079203001234"));
        assertThrows(IllegalArgumentException.class, () -> InputValidator.validateCccd("07920300123")); // 11 số
        assertThrows(IllegalArgumentException.class, () -> InputValidator.validateCccd("07920300123a"));
    }
}
