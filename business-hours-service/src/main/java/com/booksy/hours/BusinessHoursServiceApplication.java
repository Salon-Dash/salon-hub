package com.booksy.hours;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class BusinessHoursServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(BusinessHoursServiceApplication.class, args);
    }
}



















