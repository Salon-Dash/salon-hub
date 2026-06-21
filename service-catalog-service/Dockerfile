FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml ./pom.xml
RUN mvn install -N -B || true
COPY service-catalog-service/pom.xml ./service-catalog-service/pom.xml
RUN mvn dependency:go-offline -f service-catalog-service/pom.xml -B || true
COPY service-catalog-service/src ./service-catalog-service/src
RUN mvn clean package -f service-catalog-service/pom.xml -DskipTests -B

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/service-catalog-service/target/*.jar app.jar
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3     CMD wget --no-verbose --tries=1 --spider http://localhost:8087/actuator/health || exit 1
EXPOSE 8087
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser
ENTRYPOINT ["java",     "-XX:+UseContainerSupport",     "-XX:MaxRAMPercentage=75.0",     "-Djava.security.egd=file:/dev/./urandom",     "-jar", "app.jar"]
