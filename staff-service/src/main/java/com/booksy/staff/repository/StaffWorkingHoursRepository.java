package com.booksy.staff.repository;

import com.booksy.staff.model.StaffWorkingHours;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StaffWorkingHoursRepository extends JpaRepository<StaffWorkingHours, Long> {

    List<StaffWorkingHours> findByStaffId(Long staffId);

    List<StaffWorkingHours> findByStaffIdIn(List<Long> staffIds);

    void deleteByStaffId(Long staffId);
}
