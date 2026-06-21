# ── Stage 1: Dependency pre-fetch (standard Maven — fast, cached layer) ──────
FROM maven:3.9-eclipse-temurin-17 AS deps
WORKDIR /app
COPY pom.xml ./pom.xml
RUN mvn install -N -B -q
COPY service-catalog-service/pom.xml ./service-catalog-service/pom.xml
RUN mvn dependency:go-offline -f service-catalog-service/pom.xml -B -q || true

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
COPY service-catalog-service/pom.xml ./service-catalog-service/pom.xml
COPY service-catalog-service/src ./service-catalog-service/src
RUN mvn -Pnative native:compile -f service-catalog-service/pom.xml -DskipTests -B

# ── Stage 3: Minimal runtime (~25 MB Debian, no JVM) ─────────────────────────
FROM debian:12-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates wget libstdc++6 zlib1g && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd --system appgroup && useradd --system --gid appgroup appuser
WORKDIR /app
COPY --from=build /app/service-catalog-service/target/service-catalog-service ./service-catalog-service
RUN chmod +x ./service-catalog-service && chown appuser:appgroup ./service-catalog-service
USER appuser
HEALTHCHECK --interval=20s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8087/actuator/health || exit 1
EXPOSE 8087
ENTRYPOINT ["./service-catalog-service"]
