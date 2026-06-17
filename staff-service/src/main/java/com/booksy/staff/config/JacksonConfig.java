package com.booksy.staff.config;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Jackson configuration ensuring that:
 * <ul>
 *   <li>{@link java.time.DayOfWeek} serializes as its name string (e.g. "MONDAY") — not a numeric ordinal.</li>
 *   <li>{@link java.time.LocalTime} serializes as "HH:mm:ss" — not as a timestamp array.</li>
 * </ul>
 *
 * <p>These shapes are required by the booking-service {@code StaffResponse} deserialization.</p>
 */
@Configuration
public class JacksonConfig {

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer jacksonCustomizer() {
        return builder -> builder
                .serializationInclusion(JsonInclude.Include.NON_NULL)
                .featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .modules(new JavaTimeModule());
    }
}
