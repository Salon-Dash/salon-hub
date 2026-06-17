package com.booksy.booking.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationClient {

    private final WebClient webClient;

    @Value("${services.notification.url:http://notification-service:8090}")
    private String notificationServiceUrl;

    public void notifyBookingConfirmed(
            Long bookingId,
            String clientEmail,
            String clientName,
            String clientPhone,
            String serviceName,
            String staffName,
            String businessName,
            LocalDate appointmentDate,
            LocalTime startTime,
            LocalTime endTime,
            BigDecimal price) {
        sendEvent(buildEvent(bookingId, "BOOKING_CONFIRMED", clientEmail, clientName, clientPhone,
                serviceName, staffName, businessName, appointmentDate, startTime, endTime, price));
    }

    public void notifyBookingCancelled(
            Long bookingId,
            String clientEmail,
            String clientName,
            String clientPhone,
            String serviceName,
            String staffName,
            String businessName,
            LocalDate appointmentDate,
            LocalTime startTime,
            LocalTime endTime,
            BigDecimal price) {
        sendEvent(buildEvent(bookingId, "BOOKING_CANCELLED", clientEmail, clientName, clientPhone,
                serviceName, staffName, businessName, appointmentDate, startTime, endTime, price));
    }

    private Map<String, Object> buildEvent(
            Long bookingId,
            String eventType,
            String clientEmail,
            String clientName,
            String clientPhone,
            String serviceName,
            String staffName,
            String businessName,
            LocalDate appointmentDate,
            LocalTime startTime,
            LocalTime endTime,
            BigDecimal price) {
        return Map.ofEntries(
                Map.entry("bookingId", bookingId != null ? bookingId : 0L),
                Map.entry("eventType", eventType),
                Map.entry("clientEmail", clientEmail != null ? clientEmail : ""),
                Map.entry("clientName", clientName != null ? clientName : ""),
                Map.entry("clientPhone", clientPhone != null ? clientPhone : ""),
                Map.entry("serviceName", serviceName != null ? serviceName : ""),
                Map.entry("staffName", staffName != null ? staffName : ""),
                Map.entry("businessName", businessName != null ? businessName : ""),
                Map.entry("appointmentDate", appointmentDate != null ? appointmentDate.toString() : ""),
                Map.entry("startTime", startTime != null ? startTime.toString() : ""),
                Map.entry("endTime", endTime != null ? endTime.toString() : ""),
                Map.entry("price", price != null ? price : BigDecimal.ZERO)
        );
    }

    private void sendEvent(Map<String, Object> event) {
        webClient.post()
                .uri(notificationServiceUrl + "/api/notifications/booking-event")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(event)
                .retrieve()
                .bodyToMono(String.class)
                .doOnSuccess(response -> log.debug("Notification sent successfully: {}", response))
                .doOnError(ex -> log.warn("Failed to send notification to notification-service: {}", ex.getMessage()))
                .onErrorComplete()
                .subscribe();
    }
}
