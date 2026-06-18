package com.booksy.hours.service;

import com.booksy.hours.dto.BusinessHoursItemDto;
import com.booksy.hours.dto.BusinessHoursRangeDto;
import com.booksy.hours.model.BusinessHours;
import com.booksy.hours.repository.BusinessHoursRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BusinessHoursService {

    private static final Set<String> DEFAULT_OPEN_DAYS =
            Set.of("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY");
    private static final String DEFAULT_START = "09:00:00";
    private static final String DEFAULT_END   = "17:00:00";

    private final BusinessHoursRepository repository;

    /**
     * Returns the full weekly schedule for the admin dashboard.
     */
    @Transactional(readOnly = true)
    public List<BusinessHoursItemDto> getByBusiness(Long businessId) {
        List<BusinessHours> hours = repository.findByBusinessId(businessId);
        if (hours.isEmpty()) {
            // Auto-initialize Mon–Sat open, Sun closed for new businesses
            return initializeDefaults(businessId);
        }
        return hours.stream().map(this::toItemDto).collect(Collectors.toList());
    }

    /**
     * Returns the range DTO that booking-service deserialises as BusinessHoursResponse.
     * Falls back to Mon-Fri 09:00-17:00 when no DB rows exist for the business.
     */
    @Transactional(readOnly = true)
    public BusinessHoursRangeDto getForDate(Long businessId, LocalDate date) {
        List<BusinessHours> hours = repository.findByBusinessId(businessId);

        if (hours.isEmpty()) {
            log.warn("No business hours found for businessId={}, returning defaults", businessId);
            return defaultRange(businessId.intValue());
        }

        // Collect enabled days and use the specific day's times; fall back to first enabled entry
        Set<String> openDays = hours.stream()
                .filter(BusinessHours::isEnabled)
                .map(BusinessHours::getDayOfWeek)
                .collect(Collectors.toSet());

        String dayName = date.getDayOfWeek().name();
        Optional<BusinessHours> todayEntry = hours.stream()
                .filter(h -> h.getDayOfWeek().equalsIgnoreCase(dayName))
                .findFirst();

        // Use today's times if available, otherwise the first enabled entry, otherwise defaults
        LocalTime start = DEFAULT_START_TIME;
        LocalTime end   = DEFAULT_END_TIME;
        if (todayEntry.isPresent() && todayEntry.get().getStartTime() != null) {
            start = todayEntry.get().getStartTime();
            end   = todayEntry.get().getEndTime();
        } else {
            Optional<BusinessHours> anyEnabled = hours.stream()
                    .filter(h -> h.isEnabled() && h.getStartTime() != null)
                    .findFirst();
            if (anyEnabled.isPresent()) {
                start = anyEnabled.get().getStartTime();
                end   = anyEnabled.get().getEndTime();
            }
        }

        return new BusinessHoursRangeDto(
                businessId.intValue(),
                start.toString(),
                end.toString(),
                openDays
        );
    }

    /**
     * Bulk-upsert: for each DTO, update existing row if present, otherwise insert.
     */
    @Transactional
    public List<BusinessHoursItemDto> bulkUpsert(Long businessId, List<BusinessHoursItemDto> items) {
        Map<String, BusinessHours> existing = repository.findByBusinessId(businessId)
                .stream()
                .collect(Collectors.toMap(BusinessHours::getDayOfWeek, Function.identity()));

        List<BusinessHours> toSave = items.stream().map(dto -> {
            BusinessHours entity = existing.getOrDefault(dto.dayOfWeek(), new BusinessHours());
            entity.setBusinessId(businessId);
            entity.setDayOfWeek(dto.dayOfWeek());
            entity.setEnabled(dto.enabled());
            entity.setStartTime(parseTime(dto.startTime()));
            entity.setEndTime(parseTime(dto.endTime()));
            return entity;
        }).collect(Collectors.toList());

        List<BusinessHours> saved = repository.saveAll(toSave);
        log.info("Bulk-upserted {} business hours rows for businessId={}", saved.size(), businessId);
        return saved.stream().map(this::toItemDto).collect(Collectors.toList());
    }

    /**
     * Initialise a default 7-day schedule (Mon-Fri open, Sat-Sun closed) for a business.
     * Skips days that already have a row.
     */
    @Transactional
    public List<BusinessHoursItemDto> initializeDefaults(Long businessId) {
        Map<String, BusinessHours> existing = repository.findByBusinessId(businessId)
                .stream()
                .collect(Collectors.toMap(BusinessHours::getDayOfWeek, Function.identity()));

        String[] days = {"MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY",
                         "SATURDAY", "SUNDAY"};

        List<BusinessHours> toSave = new java.util.ArrayList<>();
        for (String day : days) {
            if (!existing.containsKey(day)) {
                BusinessHours bh = new BusinessHours();
                bh.setBusinessId(businessId);
                bh.setDayOfWeek(day);
                boolean weekday = DEFAULT_OPEN_DAYS.contains(day);
                bh.setEnabled(weekday);
                bh.setStartTime(weekday ? LocalTime.of(9, 0) : LocalTime.of(10, 0));
                bh.setEndTime(weekday ? LocalTime.of(17, 0) : LocalTime.of(15, 0));
                toSave.add(bh);
            }
        }

        List<BusinessHours> saved = repository.saveAll(toSave);
        log.info("Initialized {} default business hours rows for businessId={}", saved.size(), businessId);
        // Return full schedule after init
        return repository.findByBusinessId(businessId).stream()
                .map(this::toItemDto)
                .collect(Collectors.toList());
    }

    // ---- helpers ----

    private static final LocalTime DEFAULT_START_TIME = LocalTime.of(9, 0);
    private static final LocalTime DEFAULT_END_TIME   = LocalTime.of(17, 0);

    private BusinessHoursRangeDto defaultRange(int businessId) {
        return new BusinessHoursRangeDto(
                businessId,
                DEFAULT_START,
                DEFAULT_END,
                DEFAULT_OPEN_DAYS
        );
    }

    private BusinessHoursItemDto toItemDto(BusinessHours bh) {
        return new BusinessHoursItemDto(
                bh.getId(),
                bh.getBusinessId(),
                bh.getDayOfWeek(),
                bh.isEnabled(),
                bh.getStartTime() != null ? bh.getStartTime().toString() : null,
                bh.getEndTime()   != null ? bh.getEndTime().toString()   : null
        );
    }

    private LocalTime parseTime(String value) {
        if (value == null || value.isBlank()) return null;
        return LocalTime.parse(value);
    }
}
