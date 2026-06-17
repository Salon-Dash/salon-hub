package com.booksy.catalog.dto;

import java.math.BigDecimal;

public record ServiceDto(
    Long id,
    Long businessId,
    Long categoryId,
    String categoryName,
    String name,
    String description,
    Integer duration,
    BigDecimal price,
    String serviceType,
    Boolean isActive,
    Boolean isVisible
) {}
