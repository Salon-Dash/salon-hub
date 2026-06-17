# Dockerfile for auth-service
# Generated automatically - edit as needed

FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy parent POM first (for dependency management)
COPY pom.xml ./pom.xml

# Install parent POM to local repository (required for child modules)
RUN mvn install -N -B || true

# Copy service POM
COPY auth-service/pom.xml ./auth-service/pom.xml



# Download dependencies (cached layer)
RUN mvn dependency:go-offline -f auth-service/pom.xml -B || true

# Copy service source code
COPY auth-service/src ./auth-service/src

# Build application
RUN mvn clean package -f auth-service/pom.xml -DskipTests -B

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy JAR from build stage
COPY --from=build /app/auth-service/target/*.jar app.jar

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

EXPOSE 8080

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-jar", "app.jar"]
