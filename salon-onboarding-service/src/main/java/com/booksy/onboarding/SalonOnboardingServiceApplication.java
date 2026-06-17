package com.booksy.onboarding;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class SalonOnboardingServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(SalonOnboardingServiceApplication.class, args);
    }
}



















