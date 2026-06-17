package com.booksy.catalog.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "quick_sale_items")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuickSaleItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "business_id", nullable = false)
    private Long businessId;

    @Column(name = "service_id", nullable = false)
    private Long serviceId;

    @Column(name = "service_name")
    private String serviceName;

    @Column(name = "service_type")
    @Builder.Default
    private String serviceType = "SERVICE";

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "price", precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "price_type")
    @Builder.Default
    private String priceType = "FIXED";

    @Column(name = "color")
    private String color;

    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 0;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
