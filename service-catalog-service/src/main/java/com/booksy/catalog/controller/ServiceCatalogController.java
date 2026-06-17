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

    @PutMapping("/api/services/{id}")
    public ServiceDto updateService(@PathVariable Long id, @RequestBody ServiceCreateRequest request) {
        return catalogService.updateService(id, request);
    }

    @DeleteMapping("/api/services/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteService(@PathVariable Long id) {
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
}
