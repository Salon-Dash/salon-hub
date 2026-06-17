package com.booksy.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ServiceAvailability {
    private int serviceId;
    private String serviceName;
    private int durationMinutes;
    private List<AvailableMaster> availableMasters;
    private List<AvailableDate> availableDates;

    public static ServiceAvailability empty() {
        return new ServiceAvailability();
    }

    // Add setters for Lombok
    public void setServiceId(int serviceId) {
        this.serviceId = serviceId;
    }

    public void setServiceName(String serviceName) {
        this.serviceName = serviceName;
    }

    public void setDurationMinutes(int durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public void setAvailableMasters(List<AvailableMaster> availableMasters) {
        this.availableMasters = availableMasters;
    }

    public void setAvailableDates(List<AvailableDate> availableDates) {
        this.availableDates = availableDates;
    }

    public List<AvailableDate> getAvailableDates() {
        return availableDates;
    }
}