FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml ./pom.xml
RUN mvn install -N -B || true
COPY eureka-server/pom.xml ./eureka-server/pom.xml
RUN mvn dependency:go-offline -f eureka-server/pom.xml -B || true
COPY eureka-server/src ./eureka-server/src
RUN mvn clean package -f eureka-server/pom.xml -DskipTests -B

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/eureka-server/target/*.jar app.jar
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3     CMD wget --no-verbose --tries=1 --spider http://localhost:8761/actuator/health || exit 1
EXPOSE 8761
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser
ENTRYPOINT ["java",     "-XX:+UseContainerSupport",     "-XX:MaxRAMPercentage=75.0",     "-Djava.security.egd=file:/dev/./urandom",     "-jar", "app.jar"]
