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

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServiceCatalogClient {

    private final WebClient webClient;

    @Value("${services.service-catalog.url:http://service-catalog-service}")
    private String serviceCatalogServiceUrl;

    @CircuitBreaker(name = "serviceCatalogService", fallbackMethod = "getServiceStaffFallback")
    public Flux<StaffResponse> getServiceStaff(int serviceId) {
        log.debug("Fetching staff for serviceId: " + serviceId + " from service-catalog-service");

        return webClient.get()
                .uri(serviceCatalogServiceUrl + "/api/services/{serviceId}/staff", serviceId)
                .retrieve()
                .bodyToFlux(StaffResponse.class)
                .doOnNext(staff -> log.warn("Retrieved staff for service: " + staff.getName()))
                .doOnError(error -> System.out.println("Error fetching service staff: " + error.getMessage()));
    }

    public Flux<StaffResponse> getServiceStaffFallback(int serviceId, Throwable t) {
        log.warn("Circuit breaker fallback triggered for service catalog. Returning empty flux for serviceId: " + serviceId);
        return Flux.empty();
    }

    @CircuitBreaker(name = "serviceCatalogService", fallbackMethod = "getServiceInfoFallback")
    public Mono<ServiceInfo> getServiceInfo(int serviceId) {
        log.debug("Fetching service info for serviceId: " + serviceId);

        return webClient.get()
                .uri(serviceCatalogServiceUrl + "/api/services/{serviceId}", serviceId)
                .retrieve()
                .bodyToMono(ServiceInfo.class)
                .doOnNext(service -> log.warn("Retrieved service: " + service.getName()))
                .doOnError(error -> System.out.println("Error fetching service info: " + error.getMessage()));
    }

    public Mono<ServiceInfo> getServiceInfoFallback(int serviceId, Throwable t) {
        log.warn("Circuit breaker fallback for service info. Returning default for serviceId: " + serviceId);
        ServiceInfo fallback = new ServiceInfo();
        fallback.setId(serviceId);
        fallback.setName("Service #" + serviceId);
        fallback.setDurationMinutes(60);
        return Mono.just(fallback);
    }

    // Simple DTO for service information
    public static class ServiceInfo {
        private int id;
        private String name;
        private int durationMinutes;
        private int bookingInterval; // minutes between offered start times; 0 = step by duration
        private int paddingBefore;   // buffer minutes reserved before the appointment
        private int paddingAfter;    // buffer minutes reserved after the appointment

        // getters and setters
        public int getId() { return id; }
        public void setId(int id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public int getDurationMinutes() { return durationMinutes; }
        public void setDurationMinutes(int durationMinutes) { this.durationMinutes = durationMinutes; }
        public int getBookingInterval() { return bookingInterval; }
        public void setBookingInterval(int bookingInterval) { this.bookingInterval = bookingInterval; }
        public int getPaddingBefore() { return paddingBefore; }
        public void setPaddingBefore(int paddingBefore) { this.paddingBefore = paddingBefore; }
        public int getPaddingAfter() { return paddingAfter; }
        public void setPaddingAfter(int paddingAfter) { this.paddingAfter = paddingAfter; }
    }
}