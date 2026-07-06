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
    List<Long> staffIds,
    Boolean isVisible,
    Boolean mobileService,
    Boolean virtualAppointment,
    Integer bookingInterval,
    Integer paddingBefore,
    Integer paddingAfter,
    Integer processingDuring,
    Integer processingAfter
) {}
