FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml ./pom.xml
RUN mvn install -N -B || true
COPY api-gateway/pom.xml ./api-gateway/pom.xml
RUN mvn dependency:go-offline -f api-gateway/pom.xml -B || true
COPY api-gateway/src ./api-gateway/src
RUN mvn clean package -f api-gateway/pom.xml -DskipTests -B

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/api-gateway/target/*.jar app.jar
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3     CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1
EXPOSE 8080
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser
ENTRYPOINT ["java",     "-XX:+UseContainerSupport",     "-XX:MaxRAMPercentage=75.0",     "-Djava.security.egd=file:/dev/./urandom",     "-jar", "app.jar"]
