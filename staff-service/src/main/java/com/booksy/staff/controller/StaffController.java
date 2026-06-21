package com.booksy.staff.controller;

import com.booksy.staff.dto.StaffCreateRequest;
import com.booksy.staff.dto.StaffDto;
import com.booksy.staff.service.StaffService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

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
     * GET /api/staff/{id}/business/{businessId} — dashboard pattern.
     * Verifies the staff's stored businessId matches the path businessId.
     */
    @GetMapping("/{id}/business/{businessId}")
    public ResponseEntity<StaffDto> getStaffByIdAndBusiness(@PathVariable Long id,
                                                              @PathVariable Long businessId) {
        Long storedBusinessId = staffService.getBusinessIdForStaff(id);
        if (storedBusinessId != null && !storedBusinessId.equals(businessId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Staff member does not belong to business " + businessId);
        }
        return ResponseEntity.ok(staffService.getById(id));
    }

    /** GET /api/staff/{staffId}/working-hours — returns working hours for a staff member */
    @GetMapping("/{staffId}/working-hours")
    public ResponseEntity<?> getWorkingHours(@PathVariable Long staffId) {
        StaffDto staff = staffService.getById(staffId);
        return ResponseEntity.ok(staff.workingHoursStart() != null
                ? java.util.Map.of("workingHoursStart", staff.workingHoursStart(),
                                   "workingHoursEnd", staff.workingHoursEnd())
                : java.util.Map.of());
    }

    /** POST /api/staff — create staff (businessId in request body) */
    @PostMapping
    public ResponseEntity<StaffDto> createStaff(@RequestBody StaffCreateRequest request) {
        log.info("POST /api/staff name='{}'", request.name());
        return ResponseEntity.status(HttpStatus.CREATED).body(staffService.create(request));
    }

    /** POST /api/staff/business/{businessId} — dashboard pattern (businessId from path) */
    @PostMapping("/business/{businessId}")
    public ResponseEntity<StaffDto> createStaffForBusiness(@PathVariable Long businessId,
                                                             @RequestBody StaffCreateRequest request) {
        log.info("POST /api/staff/business/{} name='{}'", businessId, request.name());
        // Inject businessId from path if not provided in body
        StaffCreateRequest withBiz = request.businessId() != null ? request
                : new StaffCreateRequest(businessId, request.name(), request.email(),
                        request.phone(), request.position(), request.avatarUrl(), request.schedule());
        return ResponseEntity.status(HttpStatus.CREATED).body(staffService.create(withBiz));
    }

    /**
     * PUT /api/staff/{id} — update staff.
     * If businessId is provided in the request body, verify it matches what is stored
     * to prevent cross-business mutation.
     */
    @PutMapping("/{id}")
    public ResponseEntity<StaffDto> updateStaff(@PathVariable Long id,
                                                 @RequestBody StaffCreateRequest request) {
        log.info("PUT /api/staff/{}", id);
        if (request.businessId() != null) {
            Long storedBusinessId = staffService.getBusinessIdForStaff(id);
            if (storedBusinessId != null && !storedBusinessId.equals(request.businessId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Staff member does not belong to the specified business");
            }
        }
        return ResponseEntity.ok(staffService.update(id, request));
    }

    /**
     * PUT /api/staff/{id}/business/{businessId} — dashboard pattern.
     * Verifies the staff's stored businessId matches the path businessId before updating.
     */
    @PutMapping("/{id}/business/{businessId}")
    public ResponseEntity<StaffDto> updateStaffForBusiness(@PathVariable Long id,
                                                             @PathVariable Long businessId,
                                                             @RequestBody StaffCreateRequest request) {
        log.info("PUT /api/staff/{}/business/{}", id, businessId);
        Long storedBusinessId = staffService.getBusinessIdForStaff(id);
        if (storedBusinessId != null && !storedBusinessId.equals(businessId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Staff member does not belong to business " + businessId);
        }
        return ResponseEntity.ok(staffService.update(id, request));
    }

    /**
     * DELETE /api/staff/{id} — soft-delete.
     * No businessId in path; the operation is allowed but businessId is not verified here
     * (caller must be authenticated at the gateway level).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateStaff(@PathVariable Long id) {
        log.info("DELETE /api/staff/{}", id);
        staffService.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * DELETE /api/staff/{id}/business/{businessId} — dashboard pattern.
     * Verifies the staff's stored businessId matches the path businessId before deleting.
     */
    @DeleteMapping("/{id}/business/{businessId}")
    public ResponseEntity<Void> deactivateStaffForBusiness(@PathVariable Long id,
                                                             @PathVariable Long businessId) {
        log.info("DELETE /api/staff/{}/business/{}", id, businessId);
        Long storedBusinessId = staffService.getBusinessIdForStaff(id);
        if (storedBusinessId != null && !storedBusinessId.equals(businessId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Staff member does not belong to business " + businessId);
        }
        staffService.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
