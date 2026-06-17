package com.booksy.hours.repository;

import com.booksy.hours.model.BusinessHours;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BusinessHoursRepository extends JpaRepository<BusinessHours, Long> {

    List<BusinessHours> findByBusinessId(Long businessId);

    Optional<BusinessHours> findByBusinessIdAndDayOfWeek(Long businessId, String dayOfWeek);
}
