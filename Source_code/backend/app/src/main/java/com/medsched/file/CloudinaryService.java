package com.medsched.file;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Service
public class CloudinaryService {

    private static final Logger log = LoggerFactory.getLogger(CloudinaryService.class);
    public static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB theo SRS REQ-FILE-01
    public static final List<String> ALLOWED_CONTENT_TYPES = Arrays.asList(
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf"
    );

    private final Cloudinary cloudinary;

    public CloudinaryService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    /**
     * Tải tệp tin (ảnh đại diện, hồ sơ bệnh án) lên Cloudinary theo đúng tiêu chuẩn REQ-FILE-01.
     *
     * @param file   Tệp tin tải lên từ client (MultipartFile)
     * @param folder Thư mục lưu trữ trên Cloudinary (ví dụ: "avatars", "medical_records")
     * @return DTO FileUploadResponse chứa đường dẫn CDN công khai an toàn (HTTPS)
     */
    public FileUploadResponse uploadFile(MultipartFile file, String folder) {
        validateFile(file);

        String targetFolder = (folder != null && !folder.isBlank()) ? "medsched/" + folder.trim() : "medsched/avatars";

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "folder", targetFolder,
                    "resource_type", "auto",
                    "use_filename", true,
                    "unique_filename", true
            ));

            String secureUrl = (String) uploadResult.get("secure_url");
            String publicId = (String) uploadResult.get("public_id");
            String format = (String) uploadResult.get("format");
            Number bytes = (Number) uploadResult.get("bytes");
            long size = bytes != null ? bytes.longValue() : file.getSize();

            log.info("Uploaded file to Cloudinary: publicId={}, secureUrl={}", publicId, secureUrl);

            return new FileUploadResponse(
                    secureUrl,
                    publicId,
                    format,
                    size,
                    file.getOriginalFilename()
            );
        } catch (IOException e) {
            log.error("Failed to upload file to Cloudinary: {}", e.getMessage(), e);
            throw new RuntimeException("Lỗi khi tải tệp tin lên hệ thống lưu trữ đám mây Cloudinary: " + e.getMessage(), e);
        }
    }

    /**
     * Xác thực tệp tin: Không rỗng, kích thước <= 5MB, đúng định dạng cho phép.
     */
    public void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Tệp tin tải lên không được để trống.");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Kích thước tệp vượt quá giới hạn tối đa 5MB theo quy định.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Định dạng tệp không được hỗ trợ. Chỉ chấp nhận JPG, PNG, WEBP hoặc PDF.");
        }
    }
}
