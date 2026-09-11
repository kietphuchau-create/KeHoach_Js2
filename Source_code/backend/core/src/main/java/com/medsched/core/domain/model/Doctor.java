package com.medsched.core.domain.model;

import java.math.BigDecimal;

public record Doctor(
        String id,
        String userId,
        String specialtyId,
        String title,
        String bio,
        BigDecimal consultationFee,
        int roomNumber,
        boolean active
) {}
