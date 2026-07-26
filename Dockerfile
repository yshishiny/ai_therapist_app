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
ENV VITE_API_URL=https://aitherapistapp-production.up.railway.app
ENV VITE_APP_NAME="AI Therapist Portal"
ENV VITE_ACCESS_TOKEN_TTL_MINUTES=30
ENV NODE_ENV=production

RUN npm run build && echo "✓ Build successful" && ls -la dist/ || (echo "✗ Build failed" && exit 1)

# Runtime stage - use nginx
FROM nginx:alpine

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

# Copy built files from builder
COPY --from=builder /build/dist /usr/share/nginx/html/

# Verify dist files exist and are not empty
RUN if [ -z "$(ls -A /usr/share/nginx/html/)" ]; then \
      echo "ERROR: dist directory is empty!"; \
      ls -la /usr/share/nginx/html/; \
      exit 1; \
    fi && \
    echo "✓ Dist files copied successfully" && \
    ls -la /usr/share/nginx/html/ | head -10

EXPOSE 3000

# More lenient healthcheck: gives 30s for nginx to start, checks every 5s
HEALTHCHECK --interval=5s --timeout=5s --start-period=30s --retries=5 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
