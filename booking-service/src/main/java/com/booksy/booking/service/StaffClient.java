package com.booksy.booking.service;

import com.booksy.booking.dto.StaffResponse;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class StaffClient {

    private final WebClient webClient;

    @Value("${services.staff.url:http://staff-service}")
    private String staffServiceUrl;

    @CircuitBreaker(name = "staffService", fallbackMethod = "getStaffDetailsFallback")
    public Mono<StaffResponse> getStaffDetails(int staffId) {
        log.debug("Fetching staff details for staffId: " + staffId);

        return webClient.get()
                .uri(staffServiceUrl + "/api/staff/{staffId}", staffId)
                .retrieve()
                .bodyToMono(StaffResponse.class)
                .doOnNext(staff -> log.warn("Retrieved staff details: " + staff))
                .doOnError(error -> System.out.println("Error fetching staff details for staffId: " + staffId + " - " + error.getMessage()));
    }

    @CircuitBreaker(name = "staffService", fallbackMethod = "getAllStaffFallback")
    public Flux<StaffResponse> getAllStaff() {
        log.debug("Fetching all staff from staff-service");

        return webClient.get()
                .uri(staffServiceUrl + "/api/staff")
                .retrieve()
                .bodyToFlux(StaffResponse.class)
                .doOnNext(staff -> log.warn("Retrieved staff: " + staff.getName()))
                .doOnError(error -> System.out.println("Error fetching all staff: " + error.getMessage()));
    }

    public Flux<StaffResponse> getAllStaffFallback(Throwable t) {
        log.warn("Circuit breaker fallback triggered for getAllStaff. Returning empty flux.");
        return Flux.empty();
    }

    public Mono<StaffResponse> getStaffDetailsFallback(int staffId, Throwable t) {
        log.warn("Circuit breaker fallback triggered for staff service. Creating basic staff response for staffId: " + staffId);
        // Return basic staff info with default working hours if service is down
        StaffResponse fallback = new StaffResponse();
        fallback.setId(staffId);
        fallback.setName("Staff #" + staffId);
        return Mono.just(fallback);
    }
}