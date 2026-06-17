package com.booksy.timeoff.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "time_off")
@Data
@NoArgsConstructor
public class TimeOff {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "business_id", nullable = false)
    private Long businessId;

    @Column(name = "staff_id", nullable = false)
    private Long staffId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "is_full_day")
    private boolean isFullDay = true;

    @Column(name = "is_recurring")
    private boolean isRecurring = false;

    @Column(name = "recurrence_pattern")
    private String recurrencePattern;

    @Column(name = "recurrence_end_date")
    private LocalDate recurrenceEndDate;

    private String reason;

    @Column(name = "is_approved")
    private boolean isApproved = true;

    @Column(name = "needs_manager_approval")
    private boolean needsManagerApproval = false;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
