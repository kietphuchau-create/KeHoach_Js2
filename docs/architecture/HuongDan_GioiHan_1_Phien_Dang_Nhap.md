# 📋 HƯỚNG DẪN: Giới hạn chỉ 1 phiên đăng nhập tại 1 thời điểm (kiểu Zalo)

**Mục tiêu:** khi tài khoản đăng nhập ở thiết bị/trình duyệt B, phiên đang mở ở thiết bị A tự động bị đăng xuất.

> Tài liệu này đối chiếu trực tiếp với code hiện có ở nhánh `feature/clab-103-hieu-appointment-booking` (`security/JwtService.java`, `security/JwtAuthenticationFilter.java`, `security/SecurityConfig.java`, `auth/AuthService.java`) — không phải hướng dẫn chung chung.

---

## 🔍 Tin tốt: hạ tầng cần thiết đã có sẵn ~80%

Team Hiếu (nhánh 103) đã làm tính năng "đổi mật khẩu thì hủy toàn bộ session cũ" bằng cột `users.token_invalid_before` (đã có trong `medsched_db.sql`, `UserEntity.java`, `AppUserDetails.java`). Cơ chế này **chính là thứ cần cho yêu cầu giới hạn 1 phiên** — chỉ cần tái sử dụng đúng chỗ, gần như không phải thêm bảng hay migration mới.

Cách nó đang hoạt động (đọc trong `JwtAuthenticationFilter.doFilterInternal`):
```java
if (user.getTokenInvalidBefore() != null && claims.getIssuedAt() != null) {
    Instant issuedAt = claims.getIssuedAt().toInstant();
    if (issuedAt.isBefore(user.getTokenInvalidBefore())) {
        // token bị coi là vô hiệu, dù chưa hết hạn theo TTL
        SecurityContextHolder.clearContext();
        chain.doFilter(request, response);
        return;
    }
}
```
Tức là: mỗi token JWT có claim `issuedAt` (lúc phát hành). Nếu `issuedAt` **cũ hơn** giá trị `token_invalid_before` đang lưu trong DB của user đó → token bị từ chối, **bất kể access token còn hạn hay không**. Đây chính xác là cơ chế "Cách 1" mô tả bên dưới.

---

## ✅ CÁCH 1 — Tái sử dụng `token_invalid_before` (khuyến nghị, ít code nhất)

### Ý tưởng
Mỗi lần đăng nhập thành công ở **bất kỳ thiết bị nào**, set `token_invalid_before = thời điểm hiện tại` cho user đó. Vì mọi access token được phát hành **trước** thời điểm này (tức token của thiết bị cũ) sẽ có `issuedAt < token_invalid_before` → bị filter chặn ngay ở lần gọi API tiếp theo.

### Chỗ cần sửa duy nhất: `AuthService.java`

Hiện `login()` gọi thẳng `issueTokens(...)`:
```java
@Transactional(readOnly = true)
public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
    var authentication = authenticationManager.authenticate(...);
    AppUserDetails principal = (AppUserDetails) authentication.getPrincipal();
    UserEntity user = users.findById(principal.getUserId())
            .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy tài khoản"));
    return issueTokens(principal, user.getFullName());
}
```

Sửa thành (bỏ `readOnly = true` vì giờ có ghi DB):
```java
@Transactional
public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
    var authentication = authenticationManager.authenticate(...);
    AppUserDetails principal = (AppUserDetails) authentication.getPrincipal();
    UserEntity user = users.findById(principal.getUserId())
            .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy tài khoản"));

    // Vô hiệu hóa mọi token đã phát hành trước thời điểm này -> các thiết bị
    // đang đăng nhập khác sẽ bị từ chối ở lần gọi API tiếp theo của họ.
    user.setTokenInvalidBefore(Instant.now());
    users.save(user);

    // AppUserDetails đang giữ giá trị token_invalid_before CŨ (nạp trước khi
    // set ở trên) -> phải nạp lại để token mới phát hành có issuedAt hợp lệ.
    AppUserDetails refreshedPrincipal = userDetailsService.loadUserById(user.getId());
    return issueTokens(refreshedPrincipal, user.getFullName());
}
```

> ⚠️ **Điểm dễ sai nhất:** nếu không nạp lại `AppUserDetails` sau khi set `tokenInvalidBefore`, đối tượng `principal` cũ trong bộ nhớ vẫn mang giá trị null/cũ — không ảnh hưởng vì `tokenInvalidBefore` không nằm trong JWT, chỉ dùng để so sánh lúc *xác thực request sau này* (đọc lại từ DB mỗi lần qua `userDetailsService.loadUserById`). Nhưng vẫn nên nạp lại cho rõ ràng và nhất quán logic.

Áp dụng tương tự cho `register()` — không bắt buộc (tài khoản mới chưa có phiên nào để hủy), nhưng thêm cho đồng nhất nếu muốn.

### Có cần sửa `refresh()` không?

**Có**, để chặn cả trường hợp thiết bị cũ dùng **refresh token** (không chỉ access token) xin cấp access token mới. Refresh token cũng có claim `issuedAt`, nên thêm đúng đoạn kiểm tra `tokenInvalidBefore` y hệt filter vào `AuthService.refresh()` (hiện `refresh()` mới chỉ kiểm tra chữ ký + loại token, chưa kiểm tra `tokenInvalidBefore`):
```java
UserEntity user = users.findById(claims.getSubject())
        .orElseThrow(() -> new AppExceptions.BadRequestException("Refresh token không hợp lệ"));
if (user.getTokenInvalidBefore() != null
        && claims.getIssuedAt().toInstant().isBefore(user.getTokenInvalidBefore())) {
    throw new AppExceptions.BadRequestException("Phiên đăng nhập đã kết thúc ở thiết bị này");
}
```

### Trải nghiệm frontend

Backend trả `401` khi token bị vô hiệu — giống hệt lỗi "chưa đăng nhập" hiện có (`SecurityConfig.authenticationEntryPoint`). Ở frontend (`frontend/src/lib/api.ts` hoặc interceptor tương đương), khi nhận `401`:
1. Xóa token khỏi storage.
2. Redirect về trang login.
3. (Tùy chọn, cần thêm) hiện thông báo riêng "Tài khoản vừa đăng nhập ở thiết bị khác" — muốn phân biệt được với lỗi 401 "chưa đăng nhập" thì cần backend trả thêm 1 mã lỗi riêng (vd `errorCode: "SESSION_REVOKED"`) trong `ApiError`, thay vì dùng chung message hiện tại.

### Độ trễ thực tế

Không phải đợi hết TTL access token (30 phút) — vì filter kiểm tra `tokenInvalidBefore` **ở mọi request**, nên thiết bị cũ bị phát hiện **ngay ở lần gọi API tiếp theo của họ** (vài giây tới vài phút, tùy họ có đang thao tác hay không). Nếu họ đang đứng yên không bấm gì, chỉ bị phát hiện khi họ thao tác tiếp — đây là giới hạn cố hữu của cách kiểm tra bị động (passive), muốn tức khắc phải dùng Cách 2.

### Việc cần làm (tóm tắt)
- [ ] Sửa `AuthService.login()` — set `tokenInvalidBefore`, nạp lại principal.
- [ ] Sửa `AuthService.refresh()` — thêm kiểm tra `tokenInvalidBefore` (hiện đang thiếu).
- [ ] (Tùy chọn) Thêm `errorCode` riêng cho lỗi bị đăng xuất do phiên khác, để frontend hiện đúng thông báo.
- [ ] Viết test cho `AuthServiceTest`: đăng nhập 2 lần liên tiếp → access token đầu tiên phải bị từ chối ở request thứ 3.
- [ ] **Không cần** migration DB mới — cột đã có sẵn.

---

## ⚡ CÁCH 2 — Đẩy real-time qua WebSocket (giống Zalo thật)

### Ý tưởng
Cách 1 chỉ phát hiện được khi thiết bị cũ **chủ động gọi API**. Muốn thiết bị cũ bị đá ra **ngay lập tức** (không cần họ thao tác gì), server phải chủ động đẩy tín hiệu xuống — cần kênh 2 chiều luôn mở, tức WebSocket.

### Thành phần cần thêm

**1. Dependency** (`app/build.gradle`):
```gradle
implementation 'org.springframework.boot:spring-boot-starter-websocket'
```

**2. Cấu hình STOMP endpoint** — file mới `security/WebSocketConfig.java`:
```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOrigins("${medsched.cors.allowed-origins}") // hoặc đọc từ @Value như CorsConfig
                .withSockJS(); // fallback cho trình duyệt cũ / mạng chặn WS thô
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/queue"); // kênh gửi riêng cho từng user
        registry.setApplicationDestinationPrefixes("/app");
    }
}
```

**3. Client WebSocket phải xác thực được danh tính** — vì lúc kết nối WS không tự động có JWT như HTTP header thông thường. Cách đơn giản nhất: gắn access token vào query string lúc connect (`/ws?token=...`), rồi validate trong 1 `HandshakeInterceptor` dùng lại chính `JwtService` đang có, set `Principal` = `userId` để Spring dùng `convertAndSendToUser` đúng người.

**4. Khi login thành công (trong `AuthService.login()`, sau bước set `tokenInvalidBefore` ở Cách 1), bắn tín hiệu:**
```java
simpMessagingTemplate.convertAndSendToUser(
    user.getId(), "/queue/force-logout",
    Map.of("reason", "Tài khoản vừa đăng nhập ở thiết bị khác")
);
```

**5. Frontend:** sau khi login, mở kết nối STOMP tới `/ws`, subscribe `/user/queue/force-logout`. Nhận được message → xóa token, redirect login **ngay lập tức**, không cần đợi gọi API nào khác.

### Trade-off so với Cách 1
| | Cách 1 (passive) | Cách 2 (WebSocket) |
|---|---|---|
| Độ trễ phát hiện | Tới lần gọi API tiếp theo | Gần như tức khắc |
| Code thêm | ~30 dòng, 1 file sửa | 1 dependency mới, 2-3 file mới, cấu hình xác thực WS riêng |
| Hạ tầng | Không cần gì thêm | Cần server giữ kết nối WS mở — trên Render Starter (512MB RAM), nhiều kết nối đồng thời có thể ảnh hưởng bộ nhớ, cần theo dõi |
| Độ tin cậy khi mất mạng | Không bị ảnh hưởng (kiểm tra ở mỗi request) | Nếu client rớt WS mà không tự reconnect, sẽ không nhận được tín hiệu — **vẫn nên giữ Cách 1 làm nền** để đảm bảo, WebSocket chỉ là lớp UX thêm vào cho nhanh |

### Khuyến nghị triển khai
**Làm Cách 1 trước và luôn giữ nó** — đây là lớp đảm bảo an toàn thực sự (dù có WebSocket hay không, token cũ vẫn bị chặn ở tầng API). Cách 2 là lớp UX cộng thêm, chỉ nên làm nếu còn thời gian dư sau khi các tính năng chính (F01–F26) đã xong, vì đúng như yêu cầu ban đầu "giống Zalo" thì việc đăng xuất tức khắc mới đúng cảm giác, nhưng không làm cũng không sai chức năng.

---

## ✅ Checklist test (cho cả 2 cách)

- [ ] Đăng nhập ở trình duyệt A → giữ tab mở.
- [ ] Đăng nhập cùng tài khoản ở trình duyệt B (hoặc tab ẩn danh).
- [ ] Quay lại tab A, gọi 1 API bất kỳ (vd load lại trang) → phải nhận `401`, tự động redirect login.
- [ ] (Nếu làm Cách 2) Không cần thao tác gì ở tab A, quan sát nó tự redirect ngay khi B đăng nhập.
- [ ] Kiểm tra refresh token của A cũng bị từ chối nếu A cố gọi `/api/v1/auth/refresh` sau khi B đăng nhập.
- [ ] Đăng nhập lại ở A (thành công bình thường) → giờ B bị đá ra — xác nhận cơ chế đối xứng 2 chiều, không chỉ 1 chiều.
