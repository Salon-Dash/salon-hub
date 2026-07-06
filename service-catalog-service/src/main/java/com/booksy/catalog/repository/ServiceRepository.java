package com.booksy.catalog.repository;

import com.booksy.catalog.model.ServiceEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ServiceRepository extends JpaRepository<ServiceEntity, Long> {
    List<ServiceEntity> findByBusinessId(Long businessId);
    List<ServiceEntity> findByBusinessIdAndIsActiveTrue(Long businessId);
    // Customer-facing list: active AND visible (hidden services are admin-only).
    List<ServiceEntity> findByBusinessIdAndIsActiveTrueAndIsVisibleTrue(Long businessId);
    Optional<ServiceEntity> findByIdAndIsActiveTrue(Long id);
    List<ServiceEntity> findByBusinessIdAndCategoryIdAndIsActiveTrue(Long businessId, Long categoryId);
    List<ServiceEntity> findByCategoryIdAndIsActiveTrue(Long categoryId);
}
