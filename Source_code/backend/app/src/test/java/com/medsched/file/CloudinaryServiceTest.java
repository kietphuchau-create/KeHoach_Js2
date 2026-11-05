package com.medsched.file;

import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CloudinaryServiceTest {

    @Mock
    private Cloudinary cloudinary;

    @Mock
    private Uploader uploader;

    private CloudinaryService cloudinaryService;

    @BeforeEach
    void setUp() {
        cloudinaryService = new CloudinaryService(cloudinary);
    }

    @Test
    @DisplayName("Ném ngoại lệ khi tệp tin rỗng hoặc null")
    void testValidateFile_EmptyOrNull() {
        assertThrows(IllegalArgumentException.class, () -> cloudinaryService.validateFile(null));

        MockMultipartFile emptyFile = new MockMultipartFile("file", "test.jpg", "image/jpeg", new byte[0]);
        assertThrows(IllegalArgumentException.class, () -> cloudinaryService.validateFile(emptyFile));
    }

    @Test
    @DisplayName("Ném ngoại lệ khi kích thước tệp lớn hơn 5MB")
    void testValidateFile_ExceedsMaxSize() {
        byte[] oversizedBytes = new byte[(int) (5 * 1024 * 1024 + 1)];
        MockMultipartFile largeFile = new MockMultipartFile("file", "large.png", "image/png", oversizedBytes);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> cloudinaryService.validateFile(largeFile));
        assertTrue(ex.getMessage().contains("5MB"));
    }

    @Test
    @DisplayName("Ném ngoại lệ khi định dạng tệp không được hỗ trợ (vd: exe, txt)")
    void testValidateFile_UnsupportedFormat() {
        MockMultipartFile exeFile = new MockMultipartFile("file", "script.exe", "application/octet-stream", "hello".getBytes());
        assertThrows(IllegalArgumentException.class, () -> cloudinaryService.validateFile(exeFile));
    }

    @Test
    @DisplayName("Tải tệp tin hợp lệ lên Cloudinary thành công và trả về URL CDN an toàn")
    void testUploadFile_Success() throws IOException {
        MockMultipartFile validImage = new MockMultipartFile(
                "file",
                "doctor_avatar.jpg",
                "image/jpeg",
                "fake-image-bytes".getBytes()
        );

        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.upload(any(byte[].class), anyMap())).thenReturn(Map.of(
                "secure_url", "https://res.cloudinary.com/fjbp6est/image/upload/v12345/doctor_avatar.jpg",
                "public_id", "medsched/avatars/doctor_avatar",
                "format", "jpg",
                "bytes", 1024
        ));

        FileUploadResponse response = cloudinaryService.uploadFile(validImage, "avatars");

        assertNotNull(response);
        assertEquals("https://res.cloudinary.com/fjbp6est/image/upload/v12345/doctor_avatar.jpg", response.url());
        assertEquals("medsched/avatars/doctor_avatar", response.publicId());
        assertEquals("jpg", response.format());
        assertEquals(1024, response.size());
        assertEquals("doctor_avatar.jpg", response.originalFilename());

        verify(uploader).upload(any(byte[].class), anyMap());
    }
}

