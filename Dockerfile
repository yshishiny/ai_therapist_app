# Build stage
FROM node:18-alpine AS builder

WORKDIR /build

# Copy package files
COPY portal/package*.json ./

# Install dependencies
RUN npm ci --prefer-offline --no-audit

# Copy source
COPY portal/ .

# Build with environment variables
ENV VITE_API_URL=https://service-production.up.railway.app
ENV VITE_APP_NAME="AI Therapist Portal"
ENV VITE_ACCESS_TOKEN_TTL_MINUTES=30

RUN npm run build && echo "✓ Build successful" && ls -la dist/ || (echo "✗ Build failed" && exit 1)

# Runtime stage - use nginx
FROM nginx:alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Create proper nginx config for SPA routing
RUN cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
    listen 3000;
    server_name _;
    root /usr/share/nginx/html;
    index index.html index.htm;

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Disable caching for HTML files
    location ~* \.html?$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
    }

    # Cache assets with fingerprints
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable" always;
    }
}
EOF

# Copy public folder first as base
COPY public /usr/share/nginx/html/

# Try to copy built dist files (overwrite public)
COPY --from=builder /build/dist /usr/share/nginx/html/ 2>/dev/null || echo "⚠️  Using public folder as fallback"

# Verify at least index.html exists
RUN echo "📁 Nginx content:" && \
    ls -lah /usr/share/nginx/html/ && \
    if [ -f /usr/share/nginx/html/index.html ]; then \
      echo "✓ index.html ready"; \
    else \
      echo "❌ ERROR: index.html not found!"; \
      exit 1; \
    fi

EXPOSE 3000

# More lenient healthcheck: gives 30s for nginx to start, checks every 5s
HEALTHCHECK --interval=5s --timeout=5s --start-period=30s --retries=5 \
    CMD curl -sf http://localhost:3000/index.html > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
