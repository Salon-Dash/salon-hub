package com.booksy.catalog.controller;

import com.booksy.catalog.dto.*;
import com.booksy.catalog.service.ServiceCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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
                        request.description(), request.duration(), request.price(), request.serviceType());
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
        return catalogService.updateService(id, request);
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
        catalogService.deactivateService(id);
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
        return catalogService.updateCategory(id, name, description);
    }

    /** DELETE /api/categories/{id}/business/{businessId} — dashboard pattern */
    @DeleteMapping("/api/categories/{id}/business/{businessId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@PathVariable Long id, @PathVariable Long businessId) {
        catalogService.deleteCategory(id);
    }
}
