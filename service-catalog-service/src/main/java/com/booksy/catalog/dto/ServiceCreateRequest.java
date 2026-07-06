package com.booksy.catalog.dto;

import java.math.BigDecimal;
import java.util.List;

public record ServiceCreateRequest(
    Long businessId,
    Long categoryId,
    String name,
    String description,
    Integer durationMinutes,
    BigDecimal price,
    String serviceType,
    String color,
    String priceType,
    List<Long> staffIds
) {}
