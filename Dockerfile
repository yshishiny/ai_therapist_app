# Build stage
FROM node:18-alpine AS builder

WORKDIR /build

# Copy package files
COPY portal/package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY portal/ .

# Build with environment variables
ENV VITE_API_URL=https://aitherapistapp-production.up.railway.app
ENV VITE_APP_NAME="AI Therapist Portal"
ENV VITE_ACCESS_TOKEN_TTL_MINUTES=30
ENV NODE_ENV=production

RUN npm run build

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

# Verify dist files exist
RUN ls -la /usr/share/nginx/html/ || (echo "ERROR: dist files not found!" && exit 1)

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
