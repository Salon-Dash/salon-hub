package com.booksy.catalog.repository;

import com.booksy.catalog.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByBusinessId(Long businessId);
}
