# ── Stage 1: GraalVM native compilation ─────────────────────────────────────
# Produces a self-contained binary — no JVM needed at runtime.
# Build time: ~5-10 min (one-time per code change in CI).
# Result: 40-60 MB binary vs 300 MB JVM image.
FROM ghcr.io/graalvm/native-image-community:17-ol8 AS build

WORKDIR /app

# Install Maven + findutils (required by Maven wrapper scripts)
RUN microdnf install -y findutils curl tar && \
    curl -fsSL https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.tar.gz \
        | tar -xz -C /opt && \
    ln -s /opt/apache-maven-3.9.6/bin/mvn /usr/local/bin/mvn

# Install parent POM (required for child module dependency resolution)
COPY pom.xml ./pom.xml
RUN mvn install -N -B -q

# Pre-fetch invitation-service dependencies (cached Docker layer)
COPY invitation-service/pom.xml ./invitation-service/pom.xml
RUN mvn dependency:go-offline -f invitation-service/pom.xml -B -q || true

# Copy source and run Spring AOT + GraalVM native compilation
COPY invitation-service/src ./invitation-service/src
RUN mvn -Pnative native:compile -f invitation-service/pom.xml -DskipTests -B

# ── Stage 2: Minimal runtime — 25 MB base, no JVM ───────────────────────────
FROM debian:12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates wget libstdc++6 zlib1g && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd --system appgroup && useradd --system --gid appgroup appuser

WORKDIR /app
COPY --from=build /app/invitation-service/target/invitation-service ./invitation-service
RUN chmod +x ./invitation-service && chown appuser:appgroup ./invitation-service

USER appuser

# Native images start in ~100 ms — healthcheck start_period is 10s not 120s
HEALTHCHECK --interval=20s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8091/actuator/health || exit 1

EXPOSE 8091

ENTRYPOINT ["./invitation-service"]
