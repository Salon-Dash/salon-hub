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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServiceCatalogService {

    private final ServiceRepository serviceRepository;
    private final CategoryRepository categoryRepository;
    private final ServiceStaffAssignmentRepository assignmentRepository;
    private final AddonRepository addonRepository;
    private final QuickSaleItemRepository quickSaleItemRepository;

    public ServiceDto getServiceById(Long id) {
        ServiceEntity s = serviceRepository.findByIdAndIsActiveTrue(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Service not found: " + id));
        return toDto(s);
    }

    public List<ServiceDto> getServicesByBusiness(Long businessId) {
        return serviceRepository.findByBusinessIdAndIsActiveTrue(businessId)
            .stream().map(this::toDto).toList();
    }

    /**
     * Customer-facing service list: only services that are active AND visible.
     * Services with "Allow self-booking" off (is_visible=false) are admin-only
     * and must not appear in the customer app. The admin list above is unfiltered.
     */
    public List<ServiceDto> getPublicServicesByBusiness(Long businessId) {
        return serviceRepository.findByBusinessIdAndIsActiveTrueAndIsVisibleTrue(businessId)
            .stream().map(this::toDto).toList();
    }

    public List<StaffRefDto> getStaffForService(Long serviceId) {
        return assignmentRepository.findByServiceId(serviceId)
            .stream()
            .map(a -> new StaffRefDto((int)(long) a.getStaffId(), "Staff " + a.getStaffId(), null, null))
            .toList();
    }

    @Transactional
    public ServiceDto createService(ServiceCreateRequest req) {
        if (req.price() != null && req.price().compareTo(java.math.BigDecimal.ZERO) < 0) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "Price cannot be negative");
        }
        ServiceEntity entity = new ServiceEntity();
        entity.setBusinessId(req.businessId());
        entity.setCategoryId(req.categoryId());
        entity.setName(req.name());
        entity.setDescription(req.description());
        entity.setDuration(req.durationMinutes() != null ? req.durationMinutes() : 60);
        entity.setPrice(req.price());
        entity.setServiceType(req.serviceType() != null ? req.serviceType() : "standard");
        entity.setColor(req.color());
        entity.setPriceType(req.priceType() != null ? req.priceType() : "FIXED");
        entity.setIsActive(true);
        entity.setIsVisible(req.isVisible() != null ? req.isVisible() : true);
        entity.setMobileService(req.mobileService() != null ? req.mobileService() : false);
        entity.setVirtualAppointment(req.virtualAppointment() != null ? req.virtualAppointment() : false);
        entity.setBookingInterval(req.bookingInterval() != null ? req.bookingInterval() : 0);
        entity.setPaddingBefore(req.paddingBefore() != null ? req.paddingBefore() : 0);
        entity.setPaddingAfter(req.paddingAfter() != null ? req.paddingAfter() : 0);
        entity.setProcessingDuring(req.processingDuring() != null ? req.processingDuring() : 0);
        entity.setProcessingAfter(req.processingAfter() != null ? req.processingAfter() : 0);
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        ServiceEntity saved = serviceRepository.save(entity);
        syncStaffAssignments(saved.getId(), req.staffIds());
        return toDto(saved);
    }

    /**
     * Reconcile the service↔staff links to exactly match {@code staffIds}.
     * A null list means "leave assignments untouched" (so callers that don't
     * manage staff don't wipe them); an empty list clears all assignments.
     */
    private void syncStaffAssignments(Long serviceId, java.util.List<Long> staffIds) {
        if (staffIds == null) return;
        java.util.Set<Long> desired = new java.util.HashSet<>(staffIds);
        java.util.Set<Long> current = new java.util.HashSet<>();
        for (ServiceStaffAssignment a : assignmentRepository.findByServiceId(serviceId)) {
            current.add(a.getStaffId());
        }
        for (Long staffId : desired) {
            if (staffId != null && !current.contains(staffId)) assignStaffToService(serviceId, staffId);
        }
        for (Long staffId : current) {
            if (!desired.contains(staffId)) removeStaffFromService(serviceId, staffId);
        }
    }

    @Transactional
    public ServiceDto updateService(Long id, ServiceCreateRequest req) {
        ServiceEntity entity = serviceRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Service not found: " + id));
        // Ownership check: if caller supplies a businessId, it must match the stored one
        if (req.businessId() != null && !req.businessId().equals(entity.getBusinessId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your service");
        }
        if (req.name() != null) entity.setName(req.name());
        if (req.description() != null) entity.setDescription(req.description());
        if (req.durationMinutes() != null) entity.setDuration(req.durationMinutes());
        if (req.price() != null && req.price().compareTo(java.math.BigDecimal.ZERO) < 0) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "Price cannot be negative");
        }
        if (req.price() != null) entity.setPrice(req.price());
        if (req.categoryId() != null) entity.setCategoryId(req.categoryId());
        if (req.color() != null) entity.setColor(req.color());
        if (req.priceType() != null) entity.setPriceType(req.priceType());
        if (req.isVisible() != null) entity.setIsVisible(req.isVisible());
        if (req.mobileService() != null) entity.setMobileService(req.mobileService());
        if (req.virtualAppointment() != null) entity.setVirtualAppointment(req.virtualAppointment());
        if (req.bookingInterval() != null) entity.setBookingInterval(req.bookingInterval());
        if (req.paddingBefore() != null) entity.setPaddingBefore(req.paddingBefore());
        if (req.paddingAfter() != null) entity.setPaddingAfter(req.paddingAfter());
        if (req.processingDuring() != null) entity.setProcessingDuring(req.processingDuring());
        if (req.processingAfter() != null) entity.setProcessingAfter(req.processingAfter());
        entity.setUpdatedAt(LocalDateTime.now());
        ServiceEntity saved = serviceRepository.save(entity);
        syncStaffAssignments(saved.getId(), req.staffIds());
        return toDto(saved);
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
    public void deactivateServiceForBusiness(Long id, Long businessId) {
        ServiceEntity entity = serviceRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Service not found: " + id));
        if (!businessId.equals(entity.getBusinessId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your service");
        }
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

    /**
     * Service IDs (belonging to {@code businessId}) that {@code staffId} is assigned to.
     * Used by the staff form to show which services a staff member can perform.
     */
    public java.util.List<Long> getServiceIdsForStaff(Long businessId, Long staffId) {
        java.util.Set<Long> bizServices = serviceRepository.findByBusinessIdAndIsActiveTrue(businessId)
            .stream().map(ServiceEntity::getId).collect(java.util.stream.Collectors.toSet());
        return assignmentRepository.findByStaffId(staffId).stream()
            .map(ServiceStaffAssignment::getServiceId)
            .filter(bizServices::contains)
            .distinct()
            .toList();
    }

    /**
     * Reconcile ONE staff member's service links to exactly match {@code serviceIds},
     * restricted to services owned by {@code businessId}. Services outside the business
     * are ignored (never created or deleted), so this can only ever change assignments
     * within the caller's own tenant. A null list leaves assignments untouched.
     */
    @Transactional
    public void setStaffServices(Long businessId, Long staffId, java.util.List<Long> serviceIds) {
        if (serviceIds == null) return;
        java.util.Set<Long> bizServices = serviceRepository.findByBusinessIdAndIsActiveTrue(businessId)
            .stream().map(ServiceEntity::getId).collect(java.util.stream.Collectors.toSet());
        java.util.Set<Long> desired = serviceIds.stream()
            .filter(java.util.Objects::nonNull).filter(bizServices::contains)
            .collect(java.util.stream.Collectors.toSet());
        java.util.Set<Long> current = assignmentRepository.findByStaffId(staffId).stream()
            .map(ServiceStaffAssignment::getServiceId)
            .filter(bizServices::contains)
            .collect(java.util.stream.Collectors.toSet());
        for (Long serviceId : desired) {
            if (!current.contains(serviceId)) assignStaffToService(serviceId, staffId);
        }
        for (Long serviceId : current) {
            if (!desired.contains(serviceId)) removeStaffFromService(serviceId, staffId);
        }
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
    public CategoryDto updateCategory(Long id, Long businessId, String name, String description) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Category not found"));
        // Tenant ownership: the category must belong to the business in the path.
        // The gateway/tenant filter verified the caller owns {businessId}; here we
        // ensure {id} is not another tenant's category (cross-tenant rename/delete).
        if (businessId != null && !businessId.equals(category.getBusinessId())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Category does not belong to business " + businessId);
        }
        if (name != null) category.setName(name);
        if (description != null) category.setDescription(description);
        Category saved = categoryRepository.save(category);
        return new CategoryDto(saved.getId(), saved.getBusinessId(), saved.getName(), saved.getDescription());
    }

    @Transactional
    public void deleteCategory(Long id, Long businessId) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Category not found"));
        // Tenant ownership: refuse to delete another tenant's category (which would
        // also unlink that tenant's services below).
        if (businessId != null && !businessId.equals(category.getBusinessId())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Category does not belong to business " + businessId);
        }
        // Unlink all services from this category to avoid dangling foreign keys
        List<ServiceEntity> services = serviceRepository.findByCategoryIdAndIsActiveTrue(id);
        // Also unlink inactive services in the same category
        List<ServiceEntity> allServices = serviceRepository.findAll().stream()
            .filter(s -> id.equals(s.getCategoryId()))
            .toList();
        for (ServiceEntity svc : allServices) {
            svc.setCategoryId(null);
            serviceRepository.save(svc);
        }
        categoryRepository.deleteById(id);
    }

    // ── Services by category ──────────────────────────────────────────────────

    public List<ServiceDto> getServicesByCategory(Long categoryId) {
        return serviceRepository.findByCategoryIdAndIsActiveTrue(categoryId)
            .stream().map(this::toDto).toList();
    }

    // ── Combo items (stub — returns staff assignments reused as placeholder) ──
    // The services table has no combo relationship yet; return an empty list
    // so the frontend can render without 404.
    public List<Map<String, Object>> getComboItems(Long serviceId) {
        return List.of();
    }

    // ── Addons ────────────────────────────────────────────────────────────────

    public List<AddonDto> getAddonsByBusiness(Long businessId) {
        return addonRepository.findByBusinessIdAndIsActiveTrue(businessId)
            .stream().map(this::toAddonDto).toList();
    }

    @Transactional
    public AddonDto createAddon(Long businessId, Map<String, Object> body) {
        Addon addon = new Addon();
        addon.setBusinessId(businessId);
        addon.setName((String) body.get("name"));
        addon.setDescription((String) body.getOrDefault("description", null));
        if (body.get("price") != null) {
            addon.setPrice(new BigDecimal(body.get("price").toString()));
        }
        if (body.get("priceType") != null) {
            addon.setPriceType(body.get("priceType").toString());
        }
        addon.setColor((String) body.getOrDefault("color", null));
        addon.setIsActive(true);
        addon.setIsVisible(true);
        return toAddonDto(addonRepository.save(addon));
    }

    @Transactional
    public AddonDto updateAddon(Long id, Long businessId, Map<String, Object> body) {
        Addon addon = addonRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Addon not found: " + id));
        if (body.containsKey("name") && body.get("name") != null) {
            addon.setName(body.get("name").toString());
        }
        if (body.containsKey("description")) {
            addon.setDescription((String) body.get("description"));
        }
        if (body.containsKey("price") && body.get("price") != null) {
            addon.setPrice(new BigDecimal(body.get("price").toString()));
        }
        if (body.containsKey("priceType") && body.get("priceType") != null) {
            addon.setPriceType(body.get("priceType").toString());
        }
        if (body.containsKey("color")) {
            addon.setColor((String) body.get("color"));
        }
        if (body.containsKey("isActive") && body.get("isActive") != null) {
            addon.setIsActive(Boolean.parseBoolean(body.get("isActive").toString()));
        }
        if (body.containsKey("isVisible") && body.get("isVisible") != null) {
            addon.setIsVisible(Boolean.parseBoolean(body.get("isVisible").toString()));
        }
        return toAddonDto(addonRepository.save(addon));
    }

    @Transactional
    public void deleteAddon(Long id, Long businessId) {
        Addon addon = addonRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Addon not found: " + id));
        addon.setIsActive(false);
        addonRepository.save(addon);
    }

    // ── Quick Sale ────────────────────────────────────────────────────────────

    public List<QuickSaleItemDto> getQuickSaleItems(Long businessId) {
        return quickSaleItemRepository.findByBusinessIdOrderByDisplayOrderAsc(businessId)
            .stream().map(this::toQuickSaleItemDto).toList();
    }

    @Transactional
    public List<QuickSaleItemDto> updateQuickSaleItems(Long businessId, List<Long> serviceIds) {
        // Replace all quick-sale items for this business
        quickSaleItemRepository.deleteByBusinessId(businessId);
        int order = 0;
        for (Long serviceId : serviceIds) {
            ServiceEntity svc = serviceRepository.findById(serviceId).orElse(null);
            if (svc == null) continue;
            QuickSaleItem item = new QuickSaleItem();
            item.setBusinessId(businessId);
            item.setServiceId(serviceId);
            item.setServiceName(svc.getName());
            item.setServiceType(svc.getServiceType() != null ? svc.getServiceType().toUpperCase() : "SERVICE");
            item.setDurationMinutes(svc.getDuration());
            item.setPrice(svc.getPrice());
            item.setDisplayOrder(order++);
            quickSaleItemRepository.save(item);
        }
        return quickSaleItemRepository.findByBusinessIdOrderByDisplayOrderAsc(businessId)
            .stream().map(this::toQuickSaleItemDto).toList();
    }

    // ── DTO helpers ───────────────────────────────────────────────────────────

    private AddonDto toAddonDto(Addon a) {
        return new AddonDto(
            a.getId(), a.getBusinessId(), a.getName(), a.getDescription(),
            a.getPrice(), a.getPriceType(), a.getColor(), a.getIsActive(), a.getIsVisible()
        );
    }

    private QuickSaleItemDto toQuickSaleItemDto(QuickSaleItem q) {
        return new QuickSaleItemDto(
            q.getId(), q.getBusinessId(), q.getServiceId(), q.getServiceName(),
            q.getServiceType(), q.getDurationMinutes(), q.getPrice(), q.getPriceType(),
            q.getColor(), q.getDisplayOrder()
        );
    }

    private ServiceDto toDto(ServiceEntity s) {
        String categoryName = s.getCategoryId() != null
            ? categoryRepository.findById(s.getCategoryId()).map(Category::getName).orElse(null)
            : null;
        java.util.List<Long> staffIds = assignmentRepository.findByServiceId(s.getId())
            .stream().map(ServiceStaffAssignment::getStaffId).toList();
        return new ServiceDto(
            s.getId(), s.getBusinessId(), s.getCategoryId(), categoryName,
            s.getName(), s.getDescription(), s.getDuration(), s.getPrice(), // maps entity.duration → dto.durationMinutes
            s.getServiceType(), s.getIsActive(), s.getIsVisible(),
            s.getColor(), s.getPriceType(), staffIds,
            s.getMobileService(), s.getVirtualAppointment(),
            s.getBookingInterval(), s.getPaddingBefore(), s.getPaddingAfter(),
            s.getProcessingDuring(), s.getProcessingAfter()
        );
    }
}
