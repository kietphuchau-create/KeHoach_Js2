package com.medsched.app.adapter.in.web;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Lightweight per-user/IP guard for AI endpoints. It prevents accidental loops and spam. */
@Component
public class AiRequestGuard {
    private final int maxRequests;
    private final Duration duplicateWindow;
    private final int maxMessageChars;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final Map<String, DuplicateState> duplicateStates = new ConcurrentHashMap<>();

    public AiRequestGuard(
            @Value("${medsched.ai.guard.max-requests-per-window:20}") int maxRequests,
            @Value("${medsched.ai.guard.window-seconds:60}") long windowSeconds,
            @Value("${medsched.ai.guard.duplicate-seconds:5}") long duplicateSeconds,
            @Value("${medsched.ai.guard.max-message-chars:2000}") int maxMessageChars) {
        this.maxRequests = Math.max(1, maxRequests);
        Duration refillWindow = Duration.ofSeconds(Math.max(1, windowSeconds));
        this.duplicateWindow = Duration.ofSeconds(Math.max(1, duplicateSeconds));
        this.maxMessageChars = Math.max(100, maxMessageChars);
        this.bucketFactory = () -> Bucket.builder()
                .addLimit(limit -> limit.capacity(this.maxRequests).refillIntervally(this.maxRequests, refillWindow))
                .build();
    }

    private final java.util.function.Supplier<Bucket> bucketFactory;

    public Decision check(String key, String message) {
        return check(key, message, "");
    }

    /**
     * Kiểm tra yêu cầu AI theo cả nội dung và ngữ cảnh hội thoại. Cùng một câu
     * trả lời ngắn (ví dụ "không" hoặc "tiểu buốt") vẫn hợp lệ nếu bệnh nhân
     * đang trả lời một câu hỏi làm rõ mới; chỉ yêu cầu lặp trong cùng ngữ cảnh
     * mới được xem là thao tác gửi trùng.
     */
    public Decision check(String key, String message, String conversationContext) {
        if (message == null || message.isBlank()) return Decision.reject("Tin nhắn không được để trống.", 0);
        if (message.length() > maxMessageChars) {
            return Decision.reject("Tin nhắn quá dài. Vui lòng rút gọn còn tối đa " + maxMessageChars + " ký tự.", 0);
        }
        String safeKey = key == null || key.isBlank() ? "anonymous" : key;
        Instant now = Instant.now();
        String normalizedMessage = message.trim().toLowerCase(java.util.Locale.ROOT);
        String normalizedContext = conversationContext == null
                ? ""
                : conversationContext.trim().toLowerCase(java.util.Locale.ROOT);
        String fingerprint = normalizedMessage + "|ctx:" + Integer.toHexString(normalizedContext.hashCode());
        DuplicateState duplicate = duplicateStates.computeIfAbsent(safeKey, ignored -> new DuplicateState());
        synchronized (duplicate) {
            if (fingerprint.equals(duplicate.lastMessage) && duplicate.lastAt != null
                    && duplicate.lastAt.plus(duplicateWindow).isAfter(now)) {
                return Decision.reject("Yêu cầu giống hệt vừa được xử lý. Vui lòng chờ vài giây.", 5);
            }
            duplicate.lastMessage = fingerprint;
            duplicate.lastAt = now;
        }
        ConsumptionProbe probe = buckets.computeIfAbsent(safeKey, ignored -> bucketFactory.get())
                .tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long retryAfter = Math.max(1, Duration.ofNanos(probe.getNanosToWaitForRefill()).toSeconds() + 1);
            return Decision.reject("Bạn đã gửi quá nhiều yêu cầu AI trong thời gian ngắn. Vui lòng thử lại sau.", retryAfter);
        }
        return Decision.allow();
    }

    public int maxMessageChars() { return maxMessageChars; }

    public record Decision(boolean allowed, String message, long retryAfterSeconds) {
        static Decision allow() { return new Decision(true, null, 0); }
        static Decision reject(String message, long retryAfter) { return new Decision(false, message, retryAfter); }
    }

    private static final class DuplicateState {
        private String lastMessage;
        private Instant lastAt;
    }
}
