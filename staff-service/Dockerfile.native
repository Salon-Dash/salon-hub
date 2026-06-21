# ── Stage 1: Dependency pre-fetch (standard Maven — fast, cached layer) ──────
FROM maven:3.9-eclipse-temurin-17 AS deps
WORKDIR /app
COPY pom.xml ./pom.xml
RUN mvn install -N -B -q
COPY staff-service/pom.xml ./staff-service/pom.xml
RUN mvn dependency:go-offline -f staff-service/pom.xml -B -q || true

# ── Stage 2: GraalVM native-image compilation (~8-15 min) ────────────────────
FROM ghcr.io/graalvm/native-image-community:17-ol8 AS build
WORKDIR /app
RUN microdnf install -y findutils wget tar gzip && \
    wget -q -O /tmp/maven.tar.gz \
        https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.tar.gz && \
    tar -xzf /tmp/maven.tar.gz -C /opt && rm /tmp/maven.tar.gz && \
    ln -s /opt/apache-maven-3.9.6/bin/mvn /usr/local/bin/mvn
COPY --from=deps /root/.m2 /root/.m2
COPY pom.xml ./pom.xml
RUN mvn install -N -B -q
COPY staff-service/pom.xml ./staff-service/pom.xml
COPY staff-service/src ./staff-service/src
RUN mvn -Pnative native:compile -f staff-service/pom.xml -DskipTests -B

# ── Stage 3: Minimal runtime (~25 MB Debian, no JVM) ─────────────────────────
FROM debian:12-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates wget libstdc++6 zlib1g && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd --system appgroup && useradd --system --gid appgroup appuser
WORKDIR /app
COPY --from=build /app/staff-service/target/staff-service ./staff-service
RUN chmod +x ./staff-service && chown appuser:appgroup ./staff-service
USER appuser
HEALTHCHECK --interval=20s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8086/actuator/health || exit 1
EXPOSE 8086
ENTRYPOINT ["./staff-service"]
