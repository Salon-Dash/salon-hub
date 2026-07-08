package com.booksy.booking.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "appointments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "business_id")
    private int businessId;

    @Column(name = "staff_id")
    private int staffId;

    @Column(name = "client_id")
    private Integer clientId;

    @Column(name = "service_id")
    private int serviceId;

    @Column(name = "appointment_date")
    private LocalDate appointmentDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    private String status; // PENDING, CONFIRMED, COMPLETED, CANCELLED

    @Column(name = "service_name")
    private String serviceName;

    @Column(name = "client_name")
    private String clientName;

    @Column(name = "client_email")
    private String clientEmail;

    @Column(name = "client_phone")
    private String clientPhone;

    @Column(name = "payment_status")
    private String paymentStatus;

    private String color;

    private String notes;

    private BigDecimal price;

    public Appointment(Long id, int businessId, int staffId, Integer clientId, int serviceId, LocalDate appointmentDate, LocalTime startTime, LocalTime endTime, String status) {
        this.id = id;
        this.businessId = businessId;
        this.staffId = staffId;
        this.clientId = clientId;
        this.serviceId = serviceId;
        this.appointmentDate = appointmentDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.status = status;
    }

    // Explicit methods for environments where Lombok annotation processing is disabled.
    public void setId(Long id) { this.id = id; }
    public void setBusinessId(int businessId) { this.businessId = businessId; }
    public void setStaffId(int staffId) { this.staffId = staffId; }
    public void setClientId(Integer clientId) { this.clientId = clientId; }
    public void setServiceId(int serviceId) { this.serviceId = serviceId; }
    public void setAppointmentDate(LocalDate appointmentDate) { this.appointmentDate = appointmentDate; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }
    public void setStatus(String status) { this.status = status; }
    public void setServiceName(String serviceName) { this.serviceName = serviceName; }
    public void setClientName(String clientName) { this.clientName = clientName; }
    public void setClientEmail(String clientEmail) { this.clientEmail = clientEmail; }
    public void setClientPhone(String clientPhone) { this.clientPhone = clientPhone; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
    public void setColor(String color) { this.color = color; }
    public void setNotes(String notes) { this.notes = notes; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public Long getId() { return id; }
    public int getBusinessId() { return businessId; }
    public int getStaffId() {
        return staffId;
    }
    public Integer getClientId() { return clientId; }
    public int getServiceId() { return serviceId; }

    public LocalDate getAppointmentDate() {
        return appointmentDate;
    }
    public LocalTime getStartTime() { return startTime; }
    public LocalTime getEndTime() { return endTime; }

    public String getStatus() {
        return status;
    }
    public String getServiceName() { return serviceName; }
    public String getClientName() { return clientName; }
    public String getClientEmail() { return clientEmail; }
    public String getClientPhone() { return clientPhone; }
    public String getPaymentStatus() { return paymentStatus; }
    public String getColor() { return color; }
    public String getNotes() { return notes; }
    public BigDecimal getPrice() { return price; }
}
