package com.booksy.booking.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(
                    "http://localhost:5173",
                    "http://localhost:3000",
                    "https://salon-hub-omega.vercel.app",
                    "https://*.vercel.app",
                    // Dashboard served directly from the VPS (nginx) — same origin as /ws.
                    // Without this the browser SockJS handshake is rejected and realtime
                    // calendar updates silently stop working on the VPS deployment.
                    "http://187.124.190.92",
                    "http://187.124.190.92:*"
                )
                .withSockJS();
    }
}
