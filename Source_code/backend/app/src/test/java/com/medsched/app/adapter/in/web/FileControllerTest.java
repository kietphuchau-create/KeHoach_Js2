package com.medsched.app.adapter.in.web;

import com.medsched.file.CloudinaryService;
import com.medsched.file.FileUploadResponse;
import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.repository.DoctorJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FileControllerTest {

    @Mock
    private CloudinaryService cloudinaryService;

    @Mock
    private DoctorJpaRepository doctorRepository;

    private FileController fileController;

    @BeforeEach
    void setUp() {
        fileController = new FileController(cloudinaryService, doctorRepository);
    }

    @Test
    @DisplayName("API POST /api/files/upload trả về FileUploadResponse thành công")
    void testUploadFile_Success() {
        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", "sample-image".getBytes());
        FileUploadResponse mockResponse = new FileUploadResponse(
                "https://res.cloudinary.com/fjbp6est/image/upload/sample.png",
                "medsched/avatars/sample",
                "png",
                1200,
                "avatar.png"
        );

        when(cloudinaryService.uploadFile(eq(file), eq("avatars"))).thenReturn(mockResponse);

        ResponseEntity<FileUploadResponse> response = fileController.uploadFile(file, "avatars");

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertEquals("https://res.cloudinary.com/fjbp6est/image/upload/sample.png", response.getBody().url());
        verify(cloudinaryService).uploadFile(eq(file), eq("avatars"));
    }

    @Test
    @DisplayName("API PUT /api/doctors/{id}/avatar cập nhật avatar_url của bác sĩ thành công")
    void testUploadDoctorAvatar_Success() {
        String doctorId = "doc-001";
        MockMultipartFile file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", "sample".getBytes());

        DoctorEntity doctor = new DoctorEntity(
                doctorId, "user-001", "spec-001", "BS.CK1",
                BigDecimal.valueOf(200000), "P101", "Tieu su bac si", "old_avatar.jpg",
                Instant.now(), Instant.now()
        );

        when(doctorRepository.findById(doctorId)).thenReturn(Optional.of(doctor));
        when(cloudinaryService.uploadFile(eq(file), eq("avatars"))).thenReturn(new FileUploadResponse(
                "https://res.cloudinary.com/fjbp6est/image/upload/new_doctor_avatar.jpg",
                "medsched/avatars/new_doctor_avatar",
                "jpg",
                2048,
                "avatar.jpg"
        ));

        ResponseEntity<Map<String, Object>> response = fileController.uploadDoctorAvatar(doctorId, file);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertTrue((Boolean) response.getBody().get("success"));
        assertEquals("https://res.cloudinary.com/fjbp6est/image/upload/new_doctor_avatar.jpg", doctor.getAvatarUrl());

        verify(doctorRepository).save(doctor);
    }

    @Test
    @DisplayName("Ném ngoại lệ khi không tìm thấy Bác sĩ")
    void testUploadDoctorAvatar_DoctorNotFound() {
        String doctorId = "non-existent-id";
        MockMultipartFile file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", "sample".getBytes());

        when(doctorRepository.findById(doctorId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> fileController.uploadDoctorAvatar(doctorId, file));
        verify(doctorRepository, never()).save(any());
    }
}
