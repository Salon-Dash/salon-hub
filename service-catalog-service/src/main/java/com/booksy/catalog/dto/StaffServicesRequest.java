package com.booksy.catalog.dto;

import java.util.List;

/**
 * Request body for setting the services a single staff member can perform.
 * {@code serviceIds} is the complete desired set; the server reconciles the
 * staff's assignments to match (adding/removing links), scoped to one business.
 */
public record StaffServicesRequest(List<Long> serviceIds) {
}
