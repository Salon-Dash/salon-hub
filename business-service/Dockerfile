# Dockerfile for business-service
# Generated automatically - edit as needed

FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy parent POM first (for dependency management)
COPY pom.xml ./pom.xml

# Install parent POM to local repository (required for child modules)
RUN mvn install -N -B || true

# Copy service POM
COPY business-service/pom.xml ./business-service/pom.xml

# Copy all service POMs for dependency resolution
COPY */pom.xml ./

# Install all parent POMs (in case of multi-level hierarchy)
RUN mvn install -N -B -f pom.xml || true

# Download dependencies (cached layer)
RUN mvn dependency:go-offline -f business-service/pom.xml -B || true

# Copy service source code
COPY business-service/src ./business-service/src

# Build application
RUN mvn clean package -f business-service/pom.xml -DskipTests -B

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy JAR from build stage
COPY --from=build /app/business-service/target/*.jar app.jar

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
