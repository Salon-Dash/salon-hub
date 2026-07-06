package com.booksy.booking.controller;

import com.booksy.booking.dto.DailySlots;
import com.booksy.booking.dto.ServiceAvailability;
import com.booksy.booking.service.AvailabilityCalculationService;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/public/studios/{studioId}/services/{serviceId}")
@RequiredArgsConstructor
@Slf4j
public class PublicAvailabilityController {

    private final AvailabilityCalculationService availabilityService;

    /**
     * Get comprehensive service availability considering all constraints:
     * - Current date/time filtering
     * - Staff time-off
     * - Booked appointments (prevent double-booking)
     * - Business hours
     * - Staff working hours
     */
    @GetMapping("/availability")
    @CircuitBreaker(name = "availabilityService", fallbackMethod = "getServiceAvailabilityFallback")
    public Mono<ResponseEntity<ServiceAvailability>> getServiceAvailability(
            @PathVariable int studioId,
            @PathVariable int serviceId,
            @RequestParam(defaultValue = "30") int daysAhead) {

        log.info("Availability request: studioId={}, serviceId={}, daysAhead={}", studioId, serviceId, daysAhead);

        return availabilityService.calculateServiceAvailability(studioId, serviceId, daysAhead)
            .map(availability -> {
                log.debug("Returning availability with {} available dates", availability.getAvailableDates().size());
                return ResponseEntity.ok(availability);
            })
            .doOnError(error -> log.error("Error calculating availability for studioId={}, serviceId={}: {}", studioId, serviceId, error.getMessage()));
    }


    /**
     * Phase 2: real bookable start times for a single date.
     * Returns the actual free slots (HH:mm) for the service, optionally narrowed to
     * one staff member, respecting business+staff hours, time-off, existing
     * appointments, service duration, booking interval and padding.
     */
    @GetMapping("/slots")
    @CircuitBreaker(name = "availabilityService", fallbackMethod = "getDailySlotsFallback")
    public Mono<ResponseEntity<DailySlots>> getDailySlots(
            @PathVariable int studioId,
            @PathVariable int serviceId,
            @RequestParam String date,
            @RequestParam(required = false) Integer staffId) {

        LocalDate day = LocalDate.parse(date);
        log.info("Slots request: studioId={}, serviceId={}, date={}, staffId={}", studioId, serviceId, date, staffId);

        return availabilityService.calculateDailySlots(studioId, serviceId, day, staffId)
            .map(ResponseEntity::ok)
            .doOnError(error -> log.error("Error computing slots for studioId={}, serviceId={}, date={}: {}",
                    studioId, serviceId, date, error.getMessage()));
    }

    public Mono<ResponseEntity<DailySlots>> getDailySlotsFallback(
            int studioId, int serviceId, String date, Integer staffId, Throwable t) {
        log.warn("Circuit breaker fallback for slots. studioId={}, serviceId={}, date={}", studioId, serviceId, date);
        return Mono.just(ResponseEntity.ok(DailySlots.empty(serviceId, date, 60)));
    }

    /**
     * Fallback method when the availability service circuit breaker is open
     */
    public Mono<ResponseEntity<ServiceAvailability>> getServiceAvailabilityFallback(
            int studioId, int serviceId, int daysAhead, Throwable t) {

        log.warn("Circuit breaker fallback triggered for availability service. studioId={}, serviceId={}", studioId, serviceId);

        ServiceAvailability emptyAvailability = ServiceAvailability.empty();
        return Mono.just(ResponseEntity.ok(emptyAvailability));
    }
}