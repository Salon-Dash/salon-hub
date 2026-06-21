# ── Stage 1: Dependency pre-fetch (regular Maven/JDK — fast layer cache) ─────
# GraalVM image doesn't have Maven, so we fetch deps in a standard Maven image first.
FROM maven:3.9-eclipse-temurin-17 AS deps
WORKDIR /app
COPY pom.xml ./pom.xml
RUN mvn install -N -B -q
COPY invitation-service/pom.xml ./invitation-service/pom.xml
RUN mvn dependency:go-offline -f invitation-service/pom.xml -B -q || true

# ── Stage 2: GraalVM native compilation ──────────────────────────────────────
# Uses the pre-warmed M2 cache from stage 1 to avoid re-downloading dependencies.
FROM ghcr.io/graalvm/native-image-community:17-ol8 AS build
WORKDIR /app

# Install Maven + required tools (gzip must be explicit in ol8 minimal image)
RUN microdnf install -y findutils wget tar gzip && \
    wget -q -O /tmp/maven.tar.gz \
        https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.tar.gz && \
    tar -xzf /tmp/maven.tar.gz -C /opt && \
    rm /tmp/maven.tar.gz && \
    ln -s /opt/apache-maven-3.9.6/bin/mvn /usr/local/bin/mvn

# Copy M2 cache from the deps stage (avoids re-downloading during native compile)
COPY --from=deps /root/.m2 /root/.m2

# Copy POMs and install parent (uses cached M2)
COPY pom.xml ./pom.xml
RUN mvn install -N -B -q
COPY invitation-service/pom.xml ./invitation-service/pom.xml

# Copy source and run Spring AOT + GraalVM native-image compilation
# This produces a self-contained binary — no JVM required at runtime
COPY invitation-service/src ./invitation-service/src
RUN mvn -Pnative native:compile -f invitation-service/pom.xml -DskipTests -B

# ── Stage 3: Minimal runtime — ~25 MB OS, no JVM ────────────────────────────
FROM debian:12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates wget libstdc++6 zlib1g && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd --system appgroup && useradd --system --gid appgroup appuser

WORKDIR /app
COPY --from=build /app/invitation-service/target/invitation-service ./invitation-service
RUN chmod +x ./invitation-service && chown appuser:appgroup ./invitation-service

USER appuser

# Native images start in ~100ms — healthcheck start_period can be very short
HEALTHCHECK --interval=20s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8091/actuator/health || exit 1

EXPOSE 8091

ENTRYPOINT ["./invitation-service"]
