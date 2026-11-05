package com.medsched.common;

import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.core.domain.exception.SlotNotAvailableException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AppExceptions.NotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(AppExceptions.NotFoundException ex, HttpServletRequest req) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage(), req);
    }

    @ExceptionHandler(AppExceptions.ConflictException.class)
    public ResponseEntity<ApiError> handleConflict(AppExceptions.ConflictException ex, HttpServletRequest req) {
        return build(HttpStatus.CONFLICT, ex.getMessage(), req);
    }

    @ExceptionHandler(AppExceptions.BadRequestException.class)
    public ResponseEntity<ApiError> handleBadRequest(AppExceptions.BadRequestException ex, HttpServletRequest req) {
        return build(HttpStatus.BAD_REQUEST, ex.getMessage(), req);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArgument(IllegalArgumentException ex, HttpServletRequest req) {
        return build(HttpStatus.BAD_REQUEST, ex.getMessage(), req);
    }

    /**
     * Business errors from the core layer (booking, reception). Without this
     * mapping the exception escapes, Spring forwards to /error and returns a
     * misleading 401 instead of the real status code.
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleCoreNotFound(ResourceNotFoundException ex, HttpServletRequest req) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage(), req);
    }

    /** The slot was just taken by someone else -> 409 Conflict so the client can react. */
    @ExceptionHandler(SlotNotAvailableException.class)
    public ResponseEntity<ApiError> handleSlotNotAvailable(SlotNotAvailableException ex, HttpServletRequest req) {
        return build(HttpStatus.CONFLICT, ex.getMessage(), req);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiError> handleBadCredentials(BadCredentialsException ex, HttpServletRequest req) {
        String msg = (ex.getMessage() != null && !ex.getMessage().isBlank() && !ex.getMessage().equalsIgnoreCase("Bad credentials"))
                ? ex.getMessage()
                : "Email hoặc mật khẩu không đúng";
        return build(HttpStatus.UNAUTHORIZED, msg, req);
    }

    /**
     * REQ-AUTH-02: Sai thông tin 5 lần liên tiếp -> khóa tài khoản, trả về HTTP 423 Locked.
     */
    @ExceptionHandler({AppExceptions.AccountLockedException.class, LockedException.class})
    public ResponseEntity<ApiError> handleAccountLocked(Exception ex, HttpServletRequest req) {
        String msg = (ex.getMessage() != null && !ex.getMessage().isBlank())
                ? ex.getMessage()
                : "Tài khoản của bạn đã bị khóa do nhập sai mật khẩu 5 lần liên tiếp. Vui lòng liên hệ Quản trị viên hoặc dùng chức năng Quên mật khẩu để khôi phục.";
        return build(HttpStatus.LOCKED, msg, req);
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ApiError> handleDisabled(DisabledException ex, HttpServletRequest req) {
        return build(HttpStatus.FORBIDDEN, "Tài khoản đã bị vô hiệu hóa, vui lòng liên hệ quản trị viên", req);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex, HttpServletRequest req) {
        return build(HttpStatus.FORBIDDEN, "Tài khoản của bạn không có quyền thực hiện chức năng này", req);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, String> fields = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fields.putIfAbsent(fe.getField(), fe.getDefaultMessage());
        }
        return ResponseEntity.badRequest().body(ApiError.of(
                HttpStatus.BAD_REQUEST, "Dữ liệu gửi lên không hợp lệ", req.getRequestURI(), fields));
    }

    private ResponseEntity<ApiError> build(HttpStatus status, String message, HttpServletRequest req) {
        return ResponseEntity.status(status).body(ApiError.of(status, message, req.getRequestURI()));
    }

}
