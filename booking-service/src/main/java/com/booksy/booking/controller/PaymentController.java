package com.booksy.booking.controller;

import com.booksy.booking.service.PaymentService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;
    private final JdbcTemplate jdbcTemplate;

    @PostMapping("/checkout/{bookingId}")
    public Map<String, String> createCheckout(
            @PathVariable long bookingId,
            @RequestParam(defaultValue = "http://localhost:5173/calendar") String successUrl,
            @RequestParam(defaultValue = "http://localhost:5173/calendar") String cancelUrl) {
        // Fetch booking price and client email from DB
        Map<String, Object> booking;
        try {
            booking = jdbcTemplate.queryForMap(
                "SELECT price, client_email FROM appointments WHERE id = ?", bookingId);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found: " + bookingId);
        }
        BigDecimal price = (BigDecimal) booking.get("price");
        String email = (String) booking.get("client_email");
        if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
            return Map.of("checkoutUrl", "no-payment-required");
        }
        String url = paymentService.createCheckoutSession(bookingId, price, "usd", successUrl, cancelUrl, email);
        return Map.of("checkoutUrl", url);
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String sigHeader) {
        if (!paymentService.verifyWebhookEvent(payload, sigHeader)) {
            return ResponseEntity.status(400).body("Invalid signature");
        }
        // Parse event type and update payment_status
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(payload);
            String eventType = root.path("type").asText("");
            if ("checkout.session.completed".equals(eventType)) {
                // bookingId stored in session metadata
                String bookingIdStr = root.path("data").path("object").path("metadata").path("bookingId").asText(null);
                if (bookingIdStr == null) {
                    bookingIdStr = root.path("data").path("object").path("client_reference_id").asText(null);
                }
                if (bookingIdStr != null && !bookingIdStr.isEmpty()) {
                    long bookingId = Long.parseLong(bookingIdStr);
                    jdbcTemplate.update(
                        "UPDATE appointments SET payment_status = 'PAID', updated_at = NOW() WHERE id = ?",
                        bookingId);
                    log.info("Marked booking {} as PAID via Stripe webhook", bookingId);
                }
            }
        } catch (Exception ex) {
            log.error("Error processing webhook: {}", ex.getMessage());
        }
        return ResponseEntity.ok("received");
    }
}
