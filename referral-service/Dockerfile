FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml ./pom.xml
RUN mvn install -N -B || true
COPY referral-service/pom.xml ./referral-service/pom.xml
RUN mvn dependency:go-offline -f referral-service/pom.xml -B || true
COPY referral-service/src ./referral-service/src
RUN mvn clean package -f referral-service/pom.xml -DskipTests -B

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/referral-service/target/*.jar app.jar
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3     CMD wget --no-verbose --tries=1 --spider http://localhost:8092/actuator/health || exit 1
EXPOSE 8092
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser
ENTRYPOINT ["java",     "-XX:+UseContainerSupport",     "-XX:MaxRAMPercentage=75.0",     "-Djava.security.egd=file:/dev/./urandom",     "-jar", "app.jar"]
