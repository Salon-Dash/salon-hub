package com.booksy.catalog.repository;

import com.booksy.catalog.model.Addon;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AddonRepository extends JpaRepository<Addon, Long> {
    List<Addon> findByBusinessIdAndIsActiveTrue(Long businessId);
}
