package com.booksy.booking.service;

import com.booksy.booking.dto.BusinessHoursResponse;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Slf4j
public class BusinessHoursClient {

    private final WebClient webClient;

    @Value("${services.business-hours.url:http://business-hours-service}")
    private String businessHoursServiceUrl;

    @CircuitBreaker(name = "businessHoursService", fallbackMethod = "getBusinessHoursFallback")
    public Mono<BusinessHoursResponse> getBusinessHours(int businessId, LocalDate date) {
        log.debug("Fetching business hours for businessId: " + businessId + ", date: " + date);

        return webClient.get()
                .uri(businessHoursServiceUrl + "/api/business-hours/business/{businessId}/date/{date}",
                     businessId, date)
                .retrieve()
                .bodyToMono(BusinessHoursResponse.class)
                .doOnNext(response -> log.warn("Retrieved business hours: " + response))
                .doOnError(error -> System.out.println("Error fetching business hours for businessId: " + businessId + ", date: " + date + " - " + error.getMessage()));
    }

    public Mono<BusinessHoursResponse> getBusinessHoursFallback(int businessId, LocalDate date, Throwable t) {
        log.warn("Circuit breaker fallback triggered for business hours service. Using default hours for businessId: " + businessId + ", date: " + date);
        // Return default business hours (9 AM - 5 PM, Monday-Friday)
        return Mono.just(BusinessHoursResponse.createDefault(businessId, date));
    }
}