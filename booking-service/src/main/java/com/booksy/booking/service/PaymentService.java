package com.booksy.booking.service;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

@Service
@Slf4j
public class PaymentService {

    @Value("${stripe.secret-key:}")
    private String stripeSecretKey;

    @Value("${stripe.enabled:false}")
    private boolean stripeEnabled;

    @PostConstruct
    public void init() {
        if (stripeEnabled && !stripeSecretKey.isBlank()) {
            Stripe.apiKey = stripeSecretKey;
            log.info("Stripe initialized");
        } else {
            log.info("Stripe disabled (stripe.enabled=false or no key configured)");
        }
    }

    public String createCheckoutSession(long bookingId, BigDecimal amount, String currency,
            String successUrl, String cancelUrl, String customerEmail) {
        if (!stripeEnabled || stripeSecretKey.isBlank()) {
            log.info("Stripe disabled - returning mock session for booking {}", bookingId);
            return "mock-session-" + bookingId;
        }
        try {
            SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setCustomerEmail(customerEmail)
                .setSuccessUrl(successUrl + "?session_id={CHECKOUT_SESSION_ID}")
                .setCancelUrl(cancelUrl)
                .putMetadata("bookingId", String.valueOf(bookingId))
                .addLineItem(SessionCreateParams.LineItem.builder()
                    .setQuantity(1L)
                    .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                        .setCurrency(currency != null ? currency : "usd")
                        .setUnitAmount(amount.multiply(BigDecimal.valueOf(100)).longValue())
                        .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                            .setName("Booking #" + bookingId)
                            .build())
                        .build())
                    .build())
                .build();
            Session session = Session.create(params);
            log.info("Created Stripe checkout session {} for booking {}", session.getId(), bookingId);
            return session.getUrl();
        } catch (StripeException ex) {
            log.error("Failed to create Stripe session for booking {}: {}", bookingId, ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Payment provider error: " + ex.getMessage());
        }
    }

    public boolean verifyWebhookEvent(String payload, String sigHeader) {
        if (!stripeEnabled || stripeSecretKey.isBlank()) return true;
        try {
            String webhookSecret = System.getenv("STRIPE_WEBHOOK_SECRET");
            if (webhookSecret == null || webhookSecret.isBlank()) return true;
            Webhook.constructEvent(payload, sigHeader, webhookSecret);
            return true;
        } catch (Exception ex) {
            log.warn("Invalid Stripe webhook signature: {}", ex.getMessage());
            return false;
        }
    }
}
