package com.booksy.staff.controller;

import com.booksy.staff.dto.StaffCreateRequest;
import com.booksy.staff.dto.StaffDto;
import com.booksy.staff.service.StaffService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
@Slf4j
public class StaffController {

    private final StaffService staffService;

    /**
     * GET /api/staff/{staffId}
     * Used by booking-service StaffClient to fetch a single staff member with working hours.
     */
    @GetMapping("/{staffId}")
    public ResponseEntity<StaffDto> getStaffById(@PathVariable Long staffId) {
        log.debug("GET /api/staff/{}", staffId);
        return ResponseEntity.ok(staffService.getById(staffId));
    }

    /**
     * GET /api/staff
     * Returns all active staff. Optional ?businessId= filter.
     * Used by booking-service StaffClient#getAllStaff().
     */
    @GetMapping
    public ResponseEntity<List<StaffDto>> getAllStaff(
            @RequestParam(required = false) Long businessId) {
        log.debug("GET /api/staff businessId={}", businessId);
        return ResponseEntity.ok(staffService.getAllActive(businessId));
    }

    /**
     * GET /api/staff/business/{businessId}
     * Returns all active staff for a specific business.
     */
    @GetMapping("/business/{businessId}")
    public ResponseEntity<List<StaffDto>> getStaffByBusiness(@PathVariable Long businessId) {
        log.debug("GET /api/staff/business/{}", businessId);
        return ResponseEntity.ok(staffService.getAllByBusiness(businessId));
    }

    /**
     * POST /api/staff
     * Create a new staff member with optional working hours schedule.
     */
    @PostMapping
    public ResponseEntity<StaffDto> createStaff(@RequestBody StaffCreateRequest request) {
        log.info("POST /api/staff name='{}'", request.name());
        StaffDto created = staffService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * PUT /api/staff/{id}
     * Update an existing staff member and replace their schedule.
     */
    @PutMapping("/{id}")
    public ResponseEntity<StaffDto> updateStaff(@PathVariable Long id,
                                                 @RequestBody StaffCreateRequest request) {
        log.info("PUT /api/staff/{}", id);
        return ResponseEntity.ok(staffService.update(id, request));
    }

    /**
     * DELETE /api/staff/{id}
     * Soft-delete (deactivate) a staff member.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateStaff(@PathVariable Long id) {
        log.info("DELETE /api/staff/{}", id);
        staffService.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
