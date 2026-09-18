package com.medsched.common;

import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.Map;

/**
 * One error shape for every API, so the frontend always parses the same structure.
 *
 * @param fieldErrors per-field details when the submitted payload is invalid
 *                    (null when the failure is not a validation error)
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
