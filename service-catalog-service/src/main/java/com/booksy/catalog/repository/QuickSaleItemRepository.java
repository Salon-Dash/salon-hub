package com.booksy.catalog.repository;

import com.booksy.catalog.model.QuickSaleItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuickSaleItemRepository extends JpaRepository<QuickSaleItem, Long> {
    List<QuickSaleItem> findByBusinessIdOrderByDisplayOrderAsc(Long businessId);
    void deleteByBusinessId(Long businessId);
}
