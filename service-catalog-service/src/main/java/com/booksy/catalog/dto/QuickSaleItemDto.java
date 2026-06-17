package com.booksy.catalog.dto;

import java.math.BigDecimal;

public record QuickSaleItemDto(
    Long id,
    Long businessId,
    Long serviceId,
    String serviceName,
    String serviceType,
    Integer durationMinutes,
    BigDecimal price,
    String priceType,
    String color,
    Integer displayOrder
) {}
