package com.booksy.notification.dto;

import java.math.BigDecimal;

public record BookingNotificationEvent(
        Long bookingId,
        String eventType,         // BOOKING_CONFIRMED, BOOKING_CANCELLED, BOOKING_UPDATED
        String clientEmail,
        String clientName,
        String clientPhone,
        String serviceName,
        String staffName,
        String businessName,
        String appointmentDate,   // "2024-01-15"
        String startTime,         // "10:00"
        String endTime,           // "11:00"
        BigDecimal price
) {}
