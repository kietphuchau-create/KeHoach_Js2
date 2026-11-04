package com.medsched.app.adapter.in.web;

import com.medsched.file.CloudinaryService;
import com.medsched.file.FileUploadResponse;
import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.repository.DoctorJpaRepository;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping({"/api/files", "/api/v1/files"})
public class FileController {

    private final CloudinaryService cloudinaryService;
    private final DoctorJpaRepository doctorRepository;

    public FileController(CloudinaryService cloudinaryService, DoctorJpaRepository doctorRepository) {
        this.cloudinaryService = cloudinaryService;
        this.doctorRepository = doctorRepository;
    }

    /**
     * API tải tệp tin / hình ảnh lên Cloudinary theo đúng tiêu chuẩn SRS REQ-FILE-01.
     * Hỗ trợ định dạng: JPG, PNG, WEBP, PDF (kích thước tối đa 5MB).
     *
     * @param file   Tệp tin multipart/form-data
     * @param folder Thư mục con trên Cloudinary (mặc định: avatars)
     * @return FileUploadResponse gồm URL CDN an toàn, publicId, định dạng và kích thước
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileUploadResponse> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", required = false, defaultValue = "avatars") String folder) {
        FileUploadResponse response = cloudinaryService.uploadFile(file, folder);
        return ResponseEntity.ok(response);
    }

    /**
     * API cập nhật ảnh đại diện trực tiếp cho Bác sĩ.
     * Tải ảnh lên Cloudinary và lưu ngay URL vào cột avatar_url của DoctorEntity.
     */
    @PutMapping(value = "/doctors/{doctorId}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadDoctorAvatar(
            @PathVariable("doctorId") String doctorId,
            @RequestParam("file") MultipartFile file) {
        DoctorEntity doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bác sĩ với mã ID: " + doctorId));

        FileUploadResponse uploadResponse = cloudinaryService.uploadFile(file, "avatars");
        doctor.setAvatarUrl(uploadResponse.url());
        doctorRepository.save(doctor);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "doctorId", doctorId,
                "avatarUrl", uploadResponse.url(),
                "publicId", uploadResponse.publicId(),
                "message", "Cập nhật ảnh đại diện bác sĩ thành công lên Cloudinary"
        ));
    }
}

