package com.booksy.catalog.repository;

import com.booksy.catalog.model.ServiceStaffAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServiceStaffAssignmentRepository extends JpaRepository<ServiceStaffAssignment, Long> {
    List<ServiceStaffAssignment> findByServiceId(Long serviceId);
    List<ServiceStaffAssignment> findByStaffId(Long staffId);
    void deleteByServiceIdAndStaffId(Long serviceId, Long staffId);
    boolean existsByServiceIdAndStaffId(Long serviceId, Long staffId);
}
