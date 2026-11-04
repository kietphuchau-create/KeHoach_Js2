package com.medsched.file;

public record FileUploadResponse(
        String url,
        String publicId,
        String format,
        long size,
        String originalFilename
) {}

