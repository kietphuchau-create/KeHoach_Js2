package com.medsched.common;

import java.util.regex.Pattern;

/**
 * Bộ kiểm tra và ràng buộc dữ liệu đầu vào theo từng ký tự ở Backend (CLAB-117).
 * Ngăn chặn tuyệt đối ký tự rác, ký tự đặc biệt nguy hiểm, chữ số sai chỗ,
 * hoặc hành vi injection (XSS, SQL, Script) từ dữ liệu người dùng nhập.
 */
public final class InputValidator {

    private InputValidator() {}

    // Họ tên tiếng Việt: chỉ chữ cái Unicode và khoảng trắng (từ 2 đến 100 ký tự)
    private static final Pattern VIETNAMESE_NAME_PATTERN = Pattern.compile("^[\\p{L}\\s]{2,100}$");

    // Số điện thoại Việt Nam: 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09
    private static final Pattern VN_PHONE_PATTERN = Pattern.compile("^(0)(3|5|7|8|9)[0-9]{8}$");

    // Email RFC-5322 chuẩn: user@domain.ext
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,63}$");

    // Số CCCD: đúng 12 chữ số
    private static final Pattern CCCD_PATTERN = Pattern.compile("^[0-9]{12}$");

    // Ngày chuẩn ISO YYYY-MM-DD
    private static final Pattern ISO_DATE_PATTERN = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");

    // Khung giờ HH:mm - HH:mm
    private static final Pattern SLOT_TIME_PATTERN = Pattern.compile("^\\d{2}:\\d{2}\\s*-\\s*\\d{2}:\\d{2}$");

    // Mã đặt khám / vé hẹn
    private static final Pattern BOOKING_CODE_PATTERN = Pattern.compile("^[a-zA-Z0-9-]{4,32}$");

    /**
     * Ràng buộc số điện thoại theo từng ký tự:
     * 1. Không để trống.
     * 2. Chuẩn hóa +84 / 84 về đầu 0.
     * 3. Duyệt từng ký tự: phải là ký tự số 0-9.
     * 4. Đúng độ dài 10 chữ số.
     * 5. Phải thuộc các đầu số nhà mạng VN: 03, 05, 07, 08, 09.
     */
    public static String validatePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            throw new IllegalArgumentException("Số điện thoại không được để trống.");
        }
        String p = phone.trim();
        if (p.startsWith("+84")) {
            p = "0" + p.substring(3);
        } else if (p.startsWith("84") && p.length() == 11) {
            p = "0" + p.substring(2);
        }

        for (int i = 0; i < p.length(); i++) {
            char c = p.charAt(i);
            if (!Character.isDigit(c)) {
                throw new IllegalArgumentException("Số điện thoại chỉ được chứa các chữ số từ 0-9. Phát hiện ký tự không hợp lệ '" + c + "' tại vị trí " + (i + 1) + ".");
            }
        }

        if (p.length() != 10) {
            throw new IllegalArgumentException("Số điện thoại phải có đúng 10 chữ số (độ dài hiện tại: " + p.length() + ").");
        }

        if (!VN_PHONE_PATTERN.matcher(p).matches()) {
            throw new IllegalArgumentException("Số điện thoại '" + p + "' không đúng định dạng đầu số viễn thông Việt Nam (phải bắt đầu bằng 03, 05, 07, 08 hoặc 09).");
        }

        return p;
    }

    /**
     * Ràng buộc Họ và tên người bệnh theo từng ký tự:
     * 1. Không để trống, độ dài 2 - 100 ký tự.
     * 2. Duyệt từng ký tự:
     *    - Không được là chữ số 0-9.
     *    - Không được là ký tự đặc biệt (!@#$%^&*<>...)..
     *    - Phải là chữ cái (Unicode tiếng Việt) hoặc khoảng trắng.
     * 3. Không có nhiều khoảng trắng liên tiếp.
     */
    public static String validateFullName(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            throw new IllegalArgumentException("Họ và tên người bệnh không được để trống.");
        }
        String name = fullName.trim().replaceAll("\\s+", " ");
        if (name.length() < 2 || name.length() > 100) {
            throw new IllegalArgumentException("Họ và tên phải có độ dài từ 2 đến 100 ký tự (độ dài hiện tại: " + name.length() + ").");
        }

        for (int i = 0; i < name.length(); i++) {
            char c = name.charAt(i);
            if (Character.isDigit(c)) {
                throw new IllegalArgumentException("Họ và tên không được chứa chữ số ('" + c + "' tại vị trí " + (i + 1) + "). Vui lòng chỉ nhập chữ cái tiếng Việt.");
            }
            if (!Character.isLetter(c) && !Character.isWhitespace(c)) {
                throw new IllegalArgumentException("Họ và tên chứa ký tự đặc biệt không được phép ('" + c + "' tại vị trí " + (i + 1) + ").");
            }
        }

        if (!VIETNAMESE_NAME_PATTERN.matcher(name).matches()) {
            throw new IllegalArgumentException("Họ và tên '" + name + "' không đúng quy chuẩn chữ cái tiếng Việt.");
        }

        return name;
    }

    /**
     * Ràng buộc Gmail / Email theo từng ký tự:
     * 1. Nếu không nhập -> trả về null (cho phép tùy chọn).
     * 2. Tối đa 255 ký tự.
     * 3. Không chứa khoảng trắng hay ký tự nguy hiểm (' " < > ; ( )).
     * 4. Không chứa hai dấu chấm liên tiếp '..'.
     * 5. Khớp định dạng user@domain.ext chuẩn.
     */
    public static String validateEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        String e = email.trim();
        if (e.length() > 255) {
            throw new IllegalArgumentException("Email không được dài quá 255 ký tự.");
        }

        for (int i = 0; i < e.length(); i++) {
            char c = e.charAt(i);
            if (Character.isWhitespace(c)) {
                throw new IllegalArgumentException("Email không được chứa khoảng trắng.");
            }
            if (c == '<' || c == '>' || c == '"' || c == '\'' || c == ';' || c == '(' || c == ')' || c == '{' || c == '}') {
                throw new IllegalArgumentException("Email chứa ký tự cấm ('" + c + "' tại vị trí " + (i + 1) + ").");
            }
        }

        if (e.contains("..")) {
            throw new IllegalArgumentException("Email không được chứa hai dấu chấm liên tiếp ('..').");
        }

        if (!EMAIL_PATTERN.matcher(e).matches()) {
            throw new IllegalArgumentException("Gmail/Email '" + e + "' không đúng định dạng chuẩn (ví dụ: nguyen.van.a@gmail.com).");
        }

        return e.toLowerCase();
    }

    /**
     * Ràng buộc Triệu chứng bệnh ngắn gọn / Lý do khám:
     * 1. Tối đa 500 ký tự.
     * 2. Ràng buộc từng ký tự: cấm tuyệt đối các ký tự thẻ script/html (<, >, {, }, `, \)
     *    nhằm ngăn ngừa tấn công XSS hoặc phá vỡ cấu trúc dữ liệu.
     */
    public static String validateSymptoms(String symptoms) {
        if (symptoms == null || symptoms.isBlank()) {
            return "";
        }
        String s = symptoms.trim();
        if (s.length() > 500) {
            throw new IllegalArgumentException("Mô tả triệu chứng bệnh không được vượt quá 500 ký tự (độ dài hiện tại: " + s.length() + ").");
        }

        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '<' || c == '>' || c == '`' || c == '{' || c == '}' || c == '\\' || c == '\0') {
                throw new IllegalArgumentException("Mô tả triệu chứng chứa ký tự không an toàn ('" + c + "' tại vị trí " + (i + 1) + ").");
            }
        }

        return s;
    }

    /**
     * Ràng buộc số CCCD:
     * Đúng 12 ký tự chữ số.
     */
    public static String validateCccd(String cccd) {
        if (cccd == null || cccd.isBlank()) {
            return null;
        }
        String c = cccd.trim();
        if (c.length() != 12) {
            throw new IllegalArgumentException("Số thẻ CCCD phải có đúng 12 chữ số (độ dài hiện tại: " + c.length() + ").");
        }
        for (int i = 0; i < c.length(); i++) {
            char ch = c.charAt(i);
            if (!Character.isDigit(ch)) {
                throw new IllegalArgumentException("Số CCCD chỉ được chứa các chữ số từ 0-9. Ký tự không hợp lệ: '" + ch + "'.");
            }
        }
        if (!CCCD_PATTERN.matcher(c).matches()) {
            throw new IllegalArgumentException("Số thẻ CCCD '" + c + "' không hợp lệ.");
        }
        return c;
    }

    /**
     * Ràng buộc Mã đặt khám:
     */
    public static String validateBookingCode(String code) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("Mã đặt khám / vé hẹn không được để trống.");
        }
        String c = code.trim();
        if (!BOOKING_CODE_PATTERN.matcher(c).matches()) {
            throw new IllegalArgumentException("Mã đặt khám '" + c + "' không hợp lệ. Chỉ được chứa chữ cái, số và dấu gạch nối.");
        }
        return c;
    }

    /**
     * Ràng buộc Ngày khám ISO (YYYY-MM-DD):
     */
    public static String validateIsoDate(String date) {
        if (date == null || date.isBlank()) {
            throw new IllegalArgumentException("Ngày hẹn khám không được để trống.");
        }
        String d = date.trim();
        if (!ISO_DATE_PATTERN.matcher(d).matches()) {
            throw new IllegalArgumentException("Ngày hẹn '" + d + "' không đúng định dạng YYYY-MM-DD.");
        }
        return d;
    }

    /**
     * Ràng buộc Khung giờ khám (HH:mm - HH:mm):
     */
    public static String validateSlotTime(String slotTime) {
        if (slotTime == null || slotTime.isBlank()) {
            return "";
        }
        String t = slotTime.trim();
        if (!SLOT_TIME_PATTERN.matcher(t).matches()) {
            throw new IllegalArgumentException("Khung giờ khám '" + t + "' không đúng định dạng HH:mm - HH:mm (VD: 08:00 - 08:30).");
        }
        return t;
    }
}
