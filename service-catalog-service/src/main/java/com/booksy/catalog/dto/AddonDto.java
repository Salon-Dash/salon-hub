package com.booksy.catalog.dto;

import java.math.BigDecimal;

public record AddonDto(
    Long id,
    Long businessId,
    String name,
    String description,
    BigDecimal price,
    String priceType,
    String color,
    Boolean isActive,
    Boolean isVisible
) {}
