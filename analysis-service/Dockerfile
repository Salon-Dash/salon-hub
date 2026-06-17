# Dockerfile for analysis-service
# Generated automatically - edit as needed

FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy parent POM first (for dependency management)
COPY pom.xml ./pom.xml

# Install parent POM to local repository (required for child modules)
RUN mvn install -N -B

# Copy service POM
COPY analysis-service/pom.xml ./analysis-service/pom.xml

# Copy all POMs for multi-module build (Maven needs parent context)
COPY */pom.xml ./

# Download dependencies (cached layer)
RUN mvn dependency:go-offline -f analysis-service/pom.xml -B || true
RUN mvn dependency:resolve -f analysis-service/pom.xml -B || true

# Copy service source code
COPY analysis-service/src ./analysis-service/src

# Build application
RUN mvn clean package -f analysis-service/pom.xml -DskipTests -B

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy JAR from build stage
COPY --from=build /app/analysis-service/target/*.jar app.jar

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3     CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

EXPOSE 8080

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

ENTRYPOINT ["java",     "-XX:+UseContainerSupport",     "-XX:MaxRAMPercentage=75.0",     "-Djava.security.egd=file:/dev/./urandom",     "-jar", "app.jar"]
