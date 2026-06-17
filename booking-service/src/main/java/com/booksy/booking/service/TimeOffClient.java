package com.booksy.booking.service;

import com.booksy.booking.dto.TimeOffResponse;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Slf4j
public class TimeOffClient {

    private final WebClient webClient;

    @Value("${services.time-off.url:http://time-off-service}")
    private String timeOffServiceUrl;

    @CircuitBreaker(name = "timeOffService", fallbackMethod = "getStaffTimeOffFallback")
    public Flux<TimeOffResponse> getStaffTimeOff(int staffId, LocalDate startDate, LocalDate endDate) {
        log.debug("Fetching time-off for staffId: " + staffId + ", from: " + startDate + " to: " + endDate);

        return webClient.get()
                .uri(timeOffServiceUrl + "/api/time-off/staff/{staffId}?startDate={start}&endDate={end}",
                     staffId, startDate, endDate)
                .retrieve()
                .bodyToFlux(TimeOffResponse.class)
                .doOnNext(timeOff -> log.warn("Retrieved time-off: " + timeOff))
                .doOnError(error -> System.out.println("Error fetching time-off for staffId: " + staffId + ", date range: " + startDate + "-" + endDate + " - " + error.getMessage()));
    }

    public Flux<TimeOffResponse> getStaffTimeOffFallback(int staffId, LocalDate startDate, LocalDate endDate, Throwable t) {
        log.warn("Circuit breaker fallback triggered for time-off service. Returning empty flux for staffId: " + staffId);
        // Return empty flux - assume no time-off if service is down
        return Flux.empty();
    }
}