# 🚀 Booking Service CI/CD Pipeline

Automated deployment pipeline for the booking service using Google Cloud Artifact Registry and VM deployment.

## 📋 Quick Setup

### 1. Add GitHub Secret
Add `GCP_SA_KEY` to your GitHub repository secrets with your GCP service account JSON key.

### 2. Push Code
```bash
git add .
git commit -m "Add CI/CD pipeline for booking service"
git push origin main
```

### 3. Monitor Deployment
Go to **Actions** tab in GitHub to watch the automated deployment.

## 🔄 Pipeline Flow

```
GitHub Push → Maven Build → Docker Build → Push to GCR → Deploy to VM → Health Check
```

### Triggers
- Push to `main`/`master` branches
- Changes to any files in booking-service
- Manual trigger via GitHub Actions

## 📊 What Gets Deployed

- **Docker Image**: `us-central1-docker.pkg.dev/salon-hub-483509/booksy-repo/booking-service:latest`
- **VM**: `booksy-vm` in `us-central1-a`
- **Port**: 8083
- **Health Check**: `/actuator/health`
- **API**: `/api/public/studios/{studioId}/services/{serviceId}/availability`

## 🎯 Features

- ✅ **Real API Integration** - Uses all microservices (staff, business-hours, time-off, service-catalog)
- ✅ **Database Integration** - Real appointment data for booking prevention
- ✅ **Circuit Breaker Protection** - Fault tolerance for service calls
- ✅ **Health Monitoring** - Automatic health checks after deployment
- ✅ **Zero-downtime Deployment** - Container replacement strategy

## 🆘 Troubleshooting

### Check Logs
```bash
# GitHub Actions logs
# Go to: https://github.com/YOUR_REPO/actions

# VM Container logs
gcloud compute ssh booksy-vm --zone=us-central1-a
docker logs booking-service
```

### Common Issues
- **GCP_SA_KEY missing**: Add the secret to GitHub repository
- **Permission denied**: Check service account roles
- **Build failure**: Check Maven/Java version compatibility
- **Health check fails**: Check dependent microservices are running

## 📞 Support

The pipeline automatically deploys whenever you push booking-service code changes!