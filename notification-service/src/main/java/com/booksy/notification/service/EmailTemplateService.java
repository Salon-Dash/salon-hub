package com.booksy.notification.service;

import com.booksy.notification.dto.BookingNotificationEvent;
import org.springframework.stereotype.Service;

@Service
public class EmailTemplateService {

    public String bookingConfirmedSubject(BookingNotificationEvent e) {
        return "Booking Confirmed - " + e.serviceName() + " on " + e.appointmentDate();
    }

    public String bookingConfirmedBody(BookingNotificationEvent e) {
        return """
                Hi %s,

                Your appointment has been confirmed!

                Service: %s
                Staff: %s
                Date: %s
                Time: %s - %s
                Price: $%.2f

                Thank you for choosing %s.
                """.formatted(
                e.clientName(),
                e.serviceName(),
                e.staffName() != null ? e.staffName() : "TBD",
                e.appointmentDate(),
                e.startTime(),
                e.endTime(),
                e.price() != null ? e.price() : java.math.BigDecimal.ZERO,
                e.businessName() != null ? e.businessName() : "us");
    }

    public String bookingCancelledSubject(BookingNotificationEvent e) {
        return "Booking Cancelled - " + e.serviceName() + " on " + e.appointmentDate();
    }

    public String bookingCancelledBody(BookingNotificationEvent e) {
        return """
                Hi %s,

                Your appointment has been cancelled.

                Service: %s
                Date: %s
                Time: %s - %s

                Please contact us to reschedule.
                """.formatted(
                e.clientName(),
                e.serviceName(),
                e.appointmentDate(),
                e.startTime(),
                e.endTime());
    }
}
