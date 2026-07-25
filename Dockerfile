# Build stage for AI Therapist Portal
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files from portal directory
COPY portal/package*.json ./

# Install dependencies
RUN npm ci

# Copy portal source code
COPY portal/ .

# Set build-time environment variables for Vite
ENV VITE_API_URL=https://aitherapistapp-production.up.railway.app
ENV VITE_APP_NAME="AI Therapist Portal"
ENV VITE_ACCESS_TOKEN_TTL_MINUTES=30
ENV NODE_ENV=production

# Build the app
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install serve to run the app
RUN npm install -g serve

# Copy built app from build stage
COPY --from=build /app/dist ./dist

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the app on the PORT env variable or default to 3000
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]
