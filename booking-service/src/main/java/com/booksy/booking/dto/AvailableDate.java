package com.booksy.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AvailableDate {
    private String date; // "YYYY-MM-DD"
    private boolean hasAvailability;
    private int availableSlotsCount;
    private List<Integer> availableMasterIds;

    // Add setters for Lombok
    public void setDate(String date) {
        this.date = date;
    }

    public void setHasAvailability(boolean hasAvailability) {
        this.hasAvailability = hasAvailability;
    }

    public void setAvailableSlotsCount(int availableSlotsCount) {
        this.availableSlotsCount = availableSlotsCount;
    }

    public void setAvailableMasterIds(List<Integer> availableMasterIds) {
        this.availableMasterIds = availableMasterIds;
    }
}