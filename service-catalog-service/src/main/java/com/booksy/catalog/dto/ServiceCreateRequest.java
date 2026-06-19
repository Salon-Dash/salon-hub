package com.booksy.catalog.dto;

import java.math.BigDecimal;

public record ServiceCreateRequest(
    Long businessId,
    Long categoryId,
    String name,
    String description,
    Integer durationMinutes,
    BigDecimal price,
    String serviceType
) {}
