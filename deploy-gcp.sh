#!/bin/bash

# Google Cloud Run Deployment Script for AI Therapist Portal
# Usage: bash deploy-gcp.sh

set -e

PROJECT_ID="aitherapist-503618"
SERVICE_NAME="ai-therapist-portal"
REGION="us-central1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying AI Therapist Portal to Google Cloud Run"
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo ""

# Step 1: Authenticate with GCP
echo "1️⃣ Setting up GCP project..."
gcloud config set project $PROJECT_ID

# Step 2: Enable required APIs
echo "2️⃣ Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com

# Step 3: Build and push Docker image
echo "3️⃣ Building Docker image..."
gcloud builds submit --tag $IMAGE_NAME:latest --region $REGION

# Step 4: Deploy to Cloud Run
echo "4️⃣ Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 3600s \
  --set-env-vars "VITE_API_URL=https://api.aitherapist.app"

# Step 5: Get the service URL
echo ""
echo "5️⃣ Getting service URL..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format='value(status.url)')

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📍 Portal URL: $SERVICE_URL"
echo "📊 Monitor at: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"
echo ""
echo "Next steps:"
echo "1. Test the portal at: $SERVICE_URL"
echo "2. Set up custom domain (optional)"
echo "3. Configure CI/CD for automatic deployments"
