package com.booksy.gateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.cloud.gateway.filter.ratelimit.RedisRateLimiter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import reactor.core.publisher.Mono;

@Configuration
public class RateLimiterConfig {

    // Rate limit per IP address — used for public and auth routes
    @Primary
    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> {
            String ip = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
            if (ip == null || ip.isBlank()) {
                ip = exchange.getRequest().getRemoteAddress() != null
                    ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
                    : "unknown";
            }
            return Mono.just(ip);
        };
    }

    // Rate limit per JWT subject — authenticated users get higher limits, falls back to IP
    @Bean
    public KeyResolver userKeyResolver() {
        return exchange -> {
            String auth = exchange.getRequest().getHeaders().getFirst("Authorization");
            if (auth != null && auth.startsWith("Bearer ")) {
                String token = auth.substring(7);
                try {
                    String[] parts = token.split("\\.");
                    if (parts.length == 3) {
                        String payloadJson = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
                        int subIdx = payloadJson.indexOf("\"sub\"");
                        if (subIdx >= 0) {
                            int valStart = payloadJson.indexOf("\"", subIdx + 5) + 1;
                            int valEnd = payloadJson.indexOf("\"", valStart);
                            if (valStart > 0 && valEnd > valStart) {
                                return Mono.just("user:" + payloadJson.substring(valStart, valEnd));
                            }
                        }
                    }
                } catch (Exception ignored) {}
            }
            // Fall back to IP for unauthenticated requests
            String ip = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
            if (ip == null || ip.isBlank()) {
                ip = exchange.getRequest().getRemoteAddress() != null
                    ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
                    : "unknown";
            }
            return Mono.just("anon:" + ip);
        };
    }

    // Public endpoints: 20 req/s sustained, burst up to 30
    @Bean
    public RedisRateLimiter publicRateLimiter() {
        return new RedisRateLimiter(20, 30, 1);
    }

    // Auth endpoints: tight limit to slow brute force — 5 req/s sustained, burst 10
    @Bean
    public RedisRateLimiter authRateLimiter() {
        return new RedisRateLimiter(5, 10, 1);
    }

    // Authenticated API routes: 60 req/s sustained, burst up to 100
    @Primary
    @Bean
    public RedisRateLimiter apiRateLimiter() {
        return new RedisRateLimiter(60, 100, 1);
    }
}
