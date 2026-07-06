package com.booksy.catalog.controller;

import com.booksy.catalog.dto.*;
import com.booksy.catalog.service.ServiceCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// Service catalog REST endpoints (services, categories, addons, quick-sale).
@RestController
@RequiredArgsConstructor
public class ServiceCatalogController {

    private final ServiceCatalogService catalogService;

    @GetMapping("/api/services/{serviceId}")
    public ServiceDto getService(@PathVariable Long serviceId) {
        return catalogService.getServiceById(serviceId);
    }

    @GetMapping("/api/services/{serviceId}/staff")
    public List<StaffRefDto> getStaffForService(@PathVariable Long serviceId) {
        return catalogService.getStaffForService(serviceId);
    }

    @GetMapping("/api/services/business/{businessId}")
    public List<ServiceDto> getServicesByBusiness(@PathVariable Long businessId) {
        return catalogService.getServicesByBusiness(businessId);
    }

    /** GET /api/public/studios/{studioId}/services — customer app public endpoint */
    @GetMapping("/api/public/studios/{studioId}/services")
    public List<ServiceDto> getPublicServicesForStudio(@PathVariable Long studioId) {
        return catalogService.getPublicServicesByBusiness(studioId);
    }

    /** GET /api/public/salons/{salonId}/services — customer app fallback path */
    @GetMapping("/api/public/salons/{salonId}/services")
    public List<ServiceDto> getPublicServicesForSalon(@PathVariable Long salonId) {
        return catalogService.getPublicServicesByBusiness(salonId);
    }

    @PostMapping("/api/services")
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceDto createService(@RequestBody ServiceCreateRequest request) {
        return catalogService.createService(request);
    }

    /** POST /api/services/business/{businessId} — dashboard pattern (businessId from path) */
    @PostMapping("/api/services/business/{businessId}")
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceDto createServiceForBusiness(@PathVariable Long businessId,
                                                @RequestBody ServiceCreateRequest request) {
        ServiceCreateRequest withBiz = request.businessId() != null ? request
                : new ServiceCreateRequest(businessId, request.categoryId(), request.name(),
                        request.description(), request.durationMinutes(), request.price(), request.serviceType(),
                        request.color(), request.priceType(), request.staffIds(),
                        request.isVisible(), request.mobileService(), request.virtualAppointment(),
                        request.bookingInterval(), request.paddingBefore(), request.paddingAfter(),
                        request.processingDuring(), request.processingAfter());
        return catalogService.createService(withBiz);
    }

    @PutMapping("/api/services/{id}")
    public ServiceDto updateService(@PathVariable Long id, @RequestBody ServiceCreateRequest request) {
        return catalogService.updateService(id, request);
    }

    /** PUT /api/services/{id}/business/{businessId} — dashboard pattern */
    @PutMapping("/api/services/{id}/business/{businessId}")
    public ServiceDto updateServiceForBusiness(@PathVariable Long id,
                                                @PathVariable Long businessId,
                                                @RequestBody ServiceCreateRequest request) {
        // Merge path businessId into request so the service layer can validate ownership
        ServiceCreateRequest withBiz = new ServiceCreateRequest(
                businessId, request.categoryId(), request.name(),
                request.description(), request.durationMinutes(), request.price(), request.serviceType(),
                request.color(), request.priceType(), request.staffIds(),
                request.isVisible(), request.mobileService(), request.virtualAppointment(),
                request.bookingInterval(), request.paddingBefore(), request.paddingAfter(),
                request.processingDuring(), request.processingAfter());
        return catalogService.updateService(id, withBiz);
    }

    @DeleteMapping("/api/services/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteService(@PathVariable Long id) {
        catalogService.deactivateService(id);
    }

    /** DELETE /api/services/{id}/business/{businessId} — dashboard pattern */
    @DeleteMapping("/api/services/{id}/business/{businessId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteServiceForBusiness(@PathVariable Long id, @PathVariable Long businessId) {
        catalogService.deactivateServiceForBusiness(id, businessId);
    }

    @PostMapping("/api/services/{serviceId}/staff/{staffId}")
    @ResponseStatus(HttpStatus.CREATED)
    public void assignStaff(@PathVariable Long serviceId, @PathVariable Long staffId) {
        catalogService.assignStaffToService(serviceId, staffId);
    }

    @DeleteMapping("/api/services/{serviceId}/staff/{staffId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeStaff(@PathVariable Long serviceId, @PathVariable Long staffId) {
        catalogService.removeStaffFromService(serviceId, staffId);
    }

    @GetMapping("/api/categories/business/{businessId}")
    public List<CategoryDto> getCategories(@PathVariable Long businessId) {
        return catalogService.getCategoriesByBusiness(businessId);
    }

    @PostMapping("/api/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryDto createCategory(@RequestBody Map<String, Object> body) {
        if (body.get("businessId") == null)
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "businessId is required");
        Long businessId = Long.parseLong(body.get("businessId").toString());
        String name = (String) body.get("name");
        String description = (String) body.getOrDefault("description", null);
        return catalogService.createCategory(businessId, name, description);
    }

    /** POST /api/categories/business/{businessId} — dashboard pattern */
    @PostMapping("/api/categories/business/{businessId}")
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryDto createCategoryForBusiness(@PathVariable Long businessId,
                                                  @RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String description = (String) body.getOrDefault("description", null);
        return catalogService.createCategory(businessId, name, description);
    }

    /** PUT /api/categories/{id}/business/{businessId} — dashboard pattern */
    @PutMapping("/api/categories/{id}/business/{businessId}")
    public CategoryDto updateCategory(@PathVariable Long id, @PathVariable Long businessId,
                                       @RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String description = (String) body.getOrDefault("description", null);
        return catalogService.updateCategory(id, businessId, name, description);
    }

    /** DELETE /api/categories/{id}/business/{businessId} — dashboard pattern */
    @DeleteMapping("/api/categories/{id}/business/{businessId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@PathVariable Long id, @PathVariable Long businessId) {
        catalogService.deleteCategory(id, businessId);
    }

    // ── Services by category ──────────────────────────────────────────────────

    /** GET /api/services/category/{categoryId} */
    @GetMapping("/api/services/category/{categoryId}")
    public List<ServiceDto> getServicesByCategory(@PathVariable Long categoryId) {
        return catalogService.getServicesByCategory(categoryId);
    }

    /** GET /api/services/{serviceId}/combo-items */
    @GetMapping("/api/services/{serviceId}/combo-items")
    public List<Map<String, Object>> getComboItems(@PathVariable Long serviceId) {
        return catalogService.getComboItems(serviceId);
    }

    // ── Addons ────────────────────────────────────────────────────────────────

    /** GET /api/addons/business/{businessId} */
    @GetMapping("/api/addons/business/{businessId}")
    public List<AddonDto> getAddonsByBusiness(@PathVariable Long businessId) {
        return catalogService.getAddonsByBusiness(businessId);
    }

    /** POST /api/addons/business/{businessId} */
    @PostMapping("/api/addons/business/{businessId}")
    @ResponseStatus(HttpStatus.CREATED)
    public AddonDto createAddon(@PathVariable Long businessId, @RequestBody Map<String, Object> body) {
        return catalogService.createAddon(businessId, body);
    }

    /** PUT /api/addons/{id}/business/{businessId} */
    @PutMapping("/api/addons/{id}/business/{businessId}")
    public AddonDto updateAddon(@PathVariable Long id, @PathVariable Long businessId,
                                 @RequestBody Map<String, Object> body) {
        return catalogService.updateAddon(id, businessId, body);
    }

    /** DELETE /api/addons/{id}/business/{businessId} */
    @DeleteMapping("/api/addons/{id}/business/{businessId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAddon(@PathVariable Long id, @PathVariable Long businessId) {
        catalogService.deleteAddon(id, businessId);
    }

    // ── Quick Sale ────────────────────────────────────────────────────────────

    /** GET /api/quick-sale/business/{businessId} */
    @GetMapping("/api/quick-sale/business/{businessId}")
    public List<QuickSaleItemDto> getQuickSaleItems(@PathVariable Long businessId) {
        return catalogService.getQuickSaleItems(businessId);
    }

    /** PUT /api/quick-sale/business/{businessId} — body: array of service IDs */
    @PutMapping("/api/quick-sale/business/{businessId}")
    public List<QuickSaleItemDto> updateQuickSaleItems(@PathVariable Long businessId,
                                                        @RequestBody List<Long> serviceIds) {
        return catalogService.updateQuickSaleItems(businessId, serviceIds);
    }
}
