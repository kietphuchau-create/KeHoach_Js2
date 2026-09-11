package com.medsched.common;

/**
 * Các lỗi nghiệp vụ dùng chung, gom một chỗ để dễ đọc.
 * {@link GlobalExceptionHandler} ánh xạ từng loại sang mã HTTP tương ứng.
 */
public final class AppExceptions {

    private AppExceptions() {
    }

    /** Không tìm thấy dữ liệu ➔ HTTP 404. */
    public static class NotFoundException extends RuntimeException {
        public NotFoundException(String message) {
            super(message);
        }
    }

    /** Vi phạm ràng buộc duy nhất, ví dụ email đã đăng ký ➔ HTTP 409. */
    public static class ConflictException extends RuntimeException {
        public ConflictException(String message) {
            super(message);
        }
    }

    /** Dữ liệu hợp lệ về hình thức nhưng sai nghiệp vụ ➔ HTTP 400. */
    public static class BadRequestException extends RuntimeException {
        public BadRequestException(String message) {
            super(message);
        }
    }

}
