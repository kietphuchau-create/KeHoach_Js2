# ==========================================
# Multi-stage Dockerfile for MedSched Backend
# ==========================================

# Stage 1: Build the application
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace

# Copy gradle wrapper & configuration files first to cache dependencies
COPY gradlew .
COPY gradle ./gradle
COPY build.gradle settings.gradle ./
COPY core/build.gradle ./core/
COPY app/build.gradle ./app/

# Download dependencies
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon || true

# Copy all source files and build jar
COPY core ./core
COPY app ./app
RUN ./gradlew :app:bootJar -x test --no-daemon

# Stage 2: Lightweight runtime image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Run as non-root user
RUN addgroup -S medsched && adduser -S medsched -G medsched
USER medsched

COPY --from=builder /workspace/app/build/libs/medsched-app.jar app.jar

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-8080} -jar app.jar"]
