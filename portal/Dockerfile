# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files from portal directory
COPY portal/package*.json ./

# Install dependencies
RUN npm ci

# Copy portal source code
COPY portal/ .

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

# Expose port (Railway will use PORT env variable)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the app on the PORT env variable or default to 3000
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]
