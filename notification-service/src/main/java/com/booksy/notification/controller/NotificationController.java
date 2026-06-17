package com.booksy.notification.controller;

import com.booksy.notification.dto.BookingNotificationEvent;
import com.booksy.notification.dto.NotificationResult;
import com.booksy.notification.model.NotificationLog;
import com.booksy.notification.repository.NotificationLogRepository;
import com.booksy.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationLogRepository logRepository;

    @PostMapping("/booking-event")
    public NotificationResult handleBookingEvent(@RequestBody BookingNotificationEvent event) {
        return notificationService.sendBookingNotification(event);
    }

    @GetMapping("/booking/{bookingId}")
    public List<NotificationLog> getByBooking(@PathVariable Long bookingId) {
        return logRepository.findByBookingId(bookingId);
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }
}
