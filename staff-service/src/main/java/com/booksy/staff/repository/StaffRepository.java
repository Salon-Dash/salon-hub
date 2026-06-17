package com.booksy.staff.repository;

import com.booksy.staff.model.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StaffRepository extends JpaRepository<Staff, Long> {

    List<Staff> findByBusinessId(Long businessId);

    List<Staff> findByBusinessIdAndIsActiveTrue(Long businessId);

    Optional<Staff> findByIdAndIsActiveTrue(Long id);
}
