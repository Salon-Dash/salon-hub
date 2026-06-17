package com.booksy.timeoff;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class TimeoffServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(TimeoffServiceApplication.class, args);
    }
}


















