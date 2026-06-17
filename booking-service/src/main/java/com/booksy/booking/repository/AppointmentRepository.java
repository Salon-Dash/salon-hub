package com.booksy.booking.repository;

import com.booksy.booking.model.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    List<Appointment> findByBusinessIdAndAppointmentDate(int businessId, LocalDate date);

    @Query("SELECT a FROM Appointment a WHERE a.businessId = :businessId AND a.appointmentDate = :date AND a.status <> 'CANCELLED'")
    List<Appointment> findActiveByBusinessIdAndDate(@Param("businessId") int businessId, @Param("date") LocalDate date);

    @Query("SELECT a FROM Appointment a WHERE a.staffId = :staffId AND a.appointmentDate = :date AND a.status <> 'CANCELLED'")
    List<Appointment> findActiveByStaffIdAndDate(@Param("staffId") int staffId, @Param("date") LocalDate date);

    List<Appointment> findByClientEmailOrderByAppointmentDateDescStartTimeDesc(String clientEmail);
}
