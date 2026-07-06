package com.booksy.catalog.dto;

import java.math.BigDecimal;
import java.util.List;

public record ServiceDto(
    Long id,
    Long businessId,
    Long categoryId,
    String categoryName,
    String name,
    String description,
    Integer durationMinutes,
    BigDecimal price,
    String serviceType,
    Boolean isActive,
    Boolean isVisible,
    String color,
    String priceType,
    List<Long> staffIds
) {}
