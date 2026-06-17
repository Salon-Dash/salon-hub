package com.booksy.timeoff.repository;

import com.booksy.timeoff.model.TimeOff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TimeOffRepository extends JpaRepository<TimeOff, Long> {

    List<TimeOff> findByStaffIdAndEndDateGreaterThanEqualAndStartDateLessThanEqual(
        Long staffId, LocalDate rangeStart, LocalDate rangeEnd);

    List<TimeOff> findByBusinessId(Long businessId);

    @Query("SELECT t FROM TimeOff t WHERE t.businessId = :businessId " +
           "AND t.endDate >= :date AND t.startDate <= :date")
    List<TimeOff> findByBusinessIdAndDate(
        @Param("businessId") Long businessId, @Param("date") LocalDate date);

    @Query("SELECT t FROM TimeOff t WHERE t.businessId = :businessId " +
           "AND t.staffId = :staffId AND t.endDate >= :date AND t.startDate <= :date")
    List<TimeOff> findByBusinessIdAndStaffIdAndDate(
        @Param("businessId") Long businessId,
        @Param("staffId") Long staffId,
        @Param("date") LocalDate date);
}
