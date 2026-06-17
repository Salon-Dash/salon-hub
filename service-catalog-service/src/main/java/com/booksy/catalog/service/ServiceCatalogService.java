package com.booksy.catalog.service;

import com.booksy.catalog.dto.*;
import com.booksy.catalog.model.*;
import com.booksy.catalog.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServiceCatalogService {

    private final ServiceRepository serviceRepository;
    private final CategoryRepository categoryRepository;
    private final ServiceStaffAssignmentRepository assignmentRepository;

    public ServiceDto getServiceById(Long id) {
        ServiceEntity s = serviceRepository.findByIdAndIsActiveTrue(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Service not found: " + id));
        return toDto(s);
    }

    public List<ServiceDto> getServicesByBusiness(Long businessId) {
        return serviceRepository.findByBusinessIdAndIsActiveTrue(businessId)
            .stream().map(this::toDto).toList();
    }

    public List<StaffRefDto> getStaffForService(Long serviceId) {
        return assignmentRepository.findByServiceId(serviceId)
            .stream()
            .map(a -> new StaffRefDto((int)(long) a.getStaffId(), null, null, null))
            .toList();
    }

    @Transactional
    public ServiceDto createService(ServiceCreateRequest req) {
        ServiceEntity entity = new ServiceEntity();
        entity.setBusinessId(req.businessId());
        entity.setCategoryId(req.categoryId());
        entity.setName(req.name());
        entity.setDescription(req.description());
        entity.setDuration(req.duration() != null ? req.duration() : 60);
        entity.setPrice(req.price());
        entity.setServiceType(req.serviceType() != null ? req.serviceType() : "standard");
        entity.setIsActive(true);
        entity.setIsVisible(true);
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        return toDto(serviceRepository.save(entity));
    }

    @Transactional
    public ServiceDto updateService(Long id, ServiceCreateRequest req) {
        ServiceEntity entity = serviceRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Service not found: " + id));
        if (req.name() != null) entity.setName(req.name());
        if (req.description() != null) entity.setDescription(req.description());
        if (req.duration() != null) entity.setDuration(req.duration());
        if (req.price() != null) entity.setPrice(req.price());
        if (req.categoryId() != null) entity.setCategoryId(req.categoryId());
        entity.setUpdatedAt(LocalDateTime.now());
        return toDto(serviceRepository.save(entity));
    }

    @Transactional
    public void deactivateService(Long id) {
        ServiceEntity entity = serviceRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Service not found: " + id));
        entity.setIsActive(false);
        entity.setUpdatedAt(LocalDateTime.now());
        serviceRepository.save(entity);
    }

    @Transactional
    public void assignStaffToService(Long serviceId, Long staffId) {
        if (!assignmentRepository.existsByServiceIdAndStaffId(serviceId, staffId)) {
            ServiceStaffAssignment assignment = new ServiceStaffAssignment();
            assignment.setServiceId(serviceId);
            assignment.setStaffId(staffId);
            assignment.setCreatedAt(LocalDateTime.now());
            assignmentRepository.save(assignment);
        }
    }

    @Transactional
    public void removeStaffFromService(Long serviceId, Long staffId) {
        assignmentRepository.deleteByServiceIdAndStaffId(serviceId, staffId);
    }

    public List<CategoryDto> getCategoriesByBusiness(Long businessId) {
        return categoryRepository.findByBusinessId(businessId)
            .stream()
            .map(c -> new CategoryDto(c.getId(), c.getBusinessId(), c.getName(), c.getDescription()))
            .toList();
    }

    @Transactional
    public CategoryDto createCategory(Long businessId, String name, String description) {
        Category category = new Category();
        category.setBusinessId(businessId);
        category.setName(name);
        category.setDescription(description);
        category.setCreatedAt(LocalDateTime.now());
        Category saved = categoryRepository.save(category);
        return new CategoryDto(saved.getId(), saved.getBusinessId(), saved.getName(), saved.getDescription());
    }

    @Transactional
    public CategoryDto updateCategory(Long id, String name, String description) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Category not found"));
        if (name != null) category.setName(name);
        if (description != null) category.setDescription(description);
        Category saved = categoryRepository.save(category);
        return new CategoryDto(saved.getId(), saved.getBusinessId(), saved.getName(), saved.getDescription());
    }

    @Transactional
    public void deleteCategory(Long id) {
        categoryRepository.deleteById(id);
    }

    private ServiceDto toDto(ServiceEntity s) {
        String categoryName = s.getCategoryId() != null
            ? categoryRepository.findById(s.getCategoryId()).map(Category::getName).orElse(null)
            : null;
        return new ServiceDto(
            s.getId(), s.getBusinessId(), s.getCategoryId(), categoryName,
            s.getName(), s.getDescription(), s.getDuration(), s.getPrice(),
            s.getServiceType(), s.getIsActive(), s.getIsVisible()
        );
    }
}
