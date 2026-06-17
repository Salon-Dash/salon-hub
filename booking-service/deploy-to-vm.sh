#!/bin/bash

# Deploy Booking Service to VM
# Usage: ./deploy-to-vm.sh <image_name>

set -e

IMAGE_NAME=$1

if [ -z "$IMAGE_NAME" ]; then
    echo "❌ Error: Image name is required"
    echo "Usage: $0 <image_name>"
    exit 1
fi

echo "🚀 DEPLOYING BOOKING SERVICE TO VM"
echo "==================================="
echo "Image: $IMAGE_NAME"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[DEPLOY]${NC} $1"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Authenticate Docker to Artifact Registry
print_status "Authenticating Docker to Google Artifact Registry..."
gcloud auth configure-docker us-central1-docker.pkg.dev --quiet

# Pull the latest image
print_status "Pulling Docker image: $IMAGE_NAME"
if docker pull $IMAGE_NAME; then
    print_success "Image pulled successfully"
else
    print_error "Failed to pull image"
    exit 1
fi

# Stop existing container
print_status "Stopping existing booking-service container..."
docker stop booking-service 2>/dev/null || true
docker rm booking-service 2>/dev/null || true

# Start new container
print_status "Starting new booking-service container..."
if docker run -d \
    --name booking-service \
    --restart unless-stopped \
    -p 8083:8083 \
    -e SPRING_PROFILES_ACTIVE=docker \
    -e EUREKA_CLIENT_SERVICEURL_DEFAULTZONE="http://eureka-server:8761/eureka/" \
    -e SERVICES_BUSINESS_HOURS_URL="http://business-hours-service:8080" \
    -e SERVICES_TIME_OFF_URL="http://time-off-service:8081" \
    -e SERVICES_STAFF_URL="http://staff-service:8082" \
    -e SERVICES_SERVICE_CATALOG_URL="http://service-catalog-service:8083" \
    $IMAGE_NAME; then
    print_success "Container started successfully"
else
    print_error "Failed to start container"
    exit 1
fi

# Wait for service to be ready
print_status "Waiting for service to be ready..."
TIMEOUT=120
ELAPSED=0

while [ $ELAPSED -lt $TIMEOUT ]; do
    if curl -f -s http://localhost:8083/actuator/health > /dev/null 2>&1; then
        print_success "Service is healthy!"
        break
    fi

    sleep 5
    ELAPSED=$((ELAPSED + 5))
    print_status "Waiting... (${ELAPSED}s/${TIMEOUT}s)"
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    print_error "Service failed to become healthy within ${TIMEOUT} seconds"
    print_status "Container logs:"
    docker logs booking-service
    exit 1
fi

# Test availability endpoint
print_status "Testing availability endpoint..."
if curl -f -s "http://localhost:8083/api/public/studios/1/services/1/availability?daysAhead=1" > /dev/null 2>&1; then
    print_success "Availability endpoint is working!"
else
    print_error "Availability endpoint is not responding"
    print_status "Container logs:"
    docker logs booking-service | tail -20
    exit 1
fi

print_success "DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉"
echo ""
echo "Service is running at: http://localhost:8083"
echo "Health check: http://localhost:8083/actuator/health"
echo "Availability API: http://localhost:8083/api/public/studios/1/services/1/availability"