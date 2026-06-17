package com.booksy.notification.service;

import com.booksy.notification.dto.BookingNotificationEvent;
import com.booksy.notification.dto.NotificationResult;
import com.booksy.notification.model.NotificationLog;
import com.booksy.notification.repository.NotificationLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final JavaMailSender mailSender;
    private final EmailTemplateService templateService;
    private final NotificationLogRepository logRepository;

    @Value("${notification.email.from:noreply@booksy.com}")
    private String fromEmail;

    @Value("${notification.email.enabled:true}")
    private boolean emailEnabled;

    public NotificationResult sendBookingNotification(BookingNotificationEvent event) {
        if (event.clientEmail() == null || event.clientEmail().isBlank()) {
            log.warn("No client email for booking {}, skipping notification", event.bookingId());
            return new NotificationResult(false, "No recipient email");
        }

        String subject;
        String body;
        switch (event.eventType()) {
            case "BOOKING_CANCELLED" -> {
                subject = templateService.bookingCancelledSubject(event);
                body = templateService.bookingCancelledBody(event);
            }
            default -> {
                subject = templateService.bookingConfirmedSubject(event);
                body = templateService.bookingConfirmedBody(event);
            }
        }

        NotificationLog logEntry = new NotificationLog();
        logEntry.setBookingId(event.bookingId());
        logEntry.setRecipientEmail(event.clientEmail());
        logEntry.setRecipientPhone(event.clientPhone());
        logEntry.setType(event.eventType());
        logEntry.setSubject(subject);
        logEntry.setBody(body);

        if (!emailEnabled) {
            log.info("Email disabled. Would send '{}' to {}", subject, event.clientEmail());
            logEntry.setStatus("SKIPPED");
            logRepository.save(logEntry);
            return new NotificationResult(true, "Email disabled, logged only");
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(event.clientEmail());
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            logEntry.setStatus("SENT");
            logRepository.save(logEntry);
            log.info("Sent {} notification to {} for booking {}", event.eventType(), event.clientEmail(), event.bookingId());
            return new NotificationResult(true, "Email sent");
        } catch (Exception ex) {
            log.error("Failed to send notification for booking {}: {}", event.bookingId(), ex.getMessage());
            logEntry.setStatus("FAILED");
            logEntry.setErrorMessage(ex.getMessage());
            logRepository.save(logEntry);
            return new NotificationResult(false, ex.getMessage());
        }
    }
}
