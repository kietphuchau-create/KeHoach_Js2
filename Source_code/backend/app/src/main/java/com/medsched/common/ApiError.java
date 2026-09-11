package com.medsched.common;

import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.Map;

/**
 * Khuôn lỗi thống nhất cho mọi API, để frontend luôn đọc được cùng một cấu trúc.
 *
 * @param fieldErrors chi tiết lỗi từng trường khi dữ liệu gửi lên không hợp lệ
 *                    (null nếu không phải lỗi validate)
 */
public record ApiError(Instant timestamp,
                       int status,
                       String error,
                       String message,
                       String path,
                       Map<String, String> fieldErrors) {

    public static ApiError of(HttpStatus status, String message, String path) {
        return new ApiError(Instant.now(), status.value(), status.getReasonPhrase(), message, path, null);
    }

    public static ApiError of(HttpStatus status, String message, String path, Map<String, String> fieldErrors) {
        return new ApiError(Instant.now(), status.value(), status.getReasonPhrase(), message, path, fieldErrors);
    }

}
