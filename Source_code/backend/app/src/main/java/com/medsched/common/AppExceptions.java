package com.medsched.common;

/**
 * Shared business exceptions, grouped in one place for readability.
 * {@link GlobalExceptionHandler} maps each type to its HTTP status code.
 */
public final class AppExceptions {

    private AppExceptions() {
    }

    /** Requested data does not exist -> HTTP 404. */
    public static class NotFoundException extends RuntimeException {
        public NotFoundException(String message) {
            super(message);
        }
    }

    /** Uniqueness violated, e.g. the email is already registered -> HTTP 409. */
    public static class ConflictException extends RuntimeException {
        public ConflictException(String message) {
            super(message);
        }
    }

    /** Well-formed input that breaks a business rule -> HTTP 400. */
    public static class BadRequestException extends RuntimeException {
        public BadRequestException(String message) {
            super(message);
        }
    }

}
