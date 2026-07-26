#!/bin/bash
set -e

PROJECT_ID="25becd80-7067-4a31-bbd5-c60728dbb8a2"
RAILWAY_TOKEN="$1"

if [ -z "$RAILWAY_TOKEN" ]; then
  echo "ERROR: RAILWAY_TOKEN not provided"
  exit 1
fi

echo "🚀 Deploying portal using Railway CLI..."

# Set token
export RAILWAY_TOKEN="$RAILWAY_TOKEN"

# List current services
echo "📋 Current services:"
railway service list 2>&1 || echo "Could not list services"

echo ""
echo "🔗 Attempting to trigger deployment..."

# Try multiple deployment methods
echo "Method 1: railway redeploy (all services)"
railway redeploy 2>&1 || echo "Redeploy all failed, trying next method"

echo ""
echo "Method 2: Force push with railway up"
railway up 2>&1 || echo "Railway up failed"

echo ""
echo "✅ Deployment commands executed"
echo "Check Railway Dashboard: https://railway.app/project/$PROJECT_ID"
