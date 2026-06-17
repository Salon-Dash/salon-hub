package com.booksy.notification.repository;

import com.booksy.notification.model.NotificationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationLogRepository extends JpaRepository<NotificationLog, Long> {

    List<NotificationLog> findByBookingId(Long bookingId);

    List<NotificationLog> findByStatus(String status);
}
