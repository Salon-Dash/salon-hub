#!/bin/bash

# Deploy api-gateway to GCP with updated CORS configuration
# Usage: ./deploy-to-gcp.sh

set -e

echo "🚀 Deploying api-gateway with updated CORS configuration to GCP..."

# GCP Configuration
GCP_PROJECT="salon-hub-483509"
GCP_VM="booksy-vm"
GCP_ZONE="us-central1-a"
REMOTE_PATH="~/salon-hub/api-gateway"

# Step 1: Copy updated application.yml to GCP VM
echo "📤 Copying application.yml to GCP VM..."
gcloud compute scp src/main/resources/application.yml ${GCP_VM}:${REMOTE_PATH}/src/main/resources/application.yml \
  --zone=${GCP_ZONE} \
  --project=${GCP_PROJECT}

# Step 2: Rebuild and restart api-gateway on GCP
echo "🔨 Rebuilding api-gateway on GCP..."
gcloud compute ssh ${GCP_VM} --zone=${GCP_ZONE} --project=${GCP_PROJECT} << 'ENDSSH'
  cd ~/salon-hub/api-gateway
  
  # Build the JAR
  echo "Building api-gateway..."
  mvn clean package -DskipTests
  
  # Rebuild Docker image
  echo "Building Docker image..."
  docker build -t api-gateway:latest .
  
  # Restart the api-gateway container
  echo "Restarting api-gateway container..."
  cd ~/salon-hub
  docker-compose stop api-gateway
  docker-compose rm -f api-gateway
  docker-compose up -d api-gateway
  
  # Check status
  echo "Checking api-gateway status..."
  docker-compose ps api-gateway
  docker-compose logs --tail=50 api-gateway
ENDSSH

echo "✅ Deployment complete!"
echo "🔍 WebSocket endpoint: https://34.44.232.95:8443/ws"
echo "🌐 CORS now allows: https://salon-hub-omega.vercel.app"
