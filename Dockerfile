# Build stage
FROM node:18-alpine AS builder

WORKDIR /build

COPY portal/package*.json ./
RUN npm ci --prefer-offline --no-audit

COPY portal/ .

ENV VITE_API_URL=https://service-production.up.railway.app
ENV VITE_APP_NAME="AI Therapist Portal"
ENV VITE_ACCESS_TOKEN_TTL_MINUTES=30

RUN npm run build

# Runtime stage
FROM nginx:alpine

RUN apk add --no-cache curl

COPY --from=builder /build/dist /usr/share/nginx/html/
COPY public /usr/share/nginx/html/

# Nginx config for SPA routing
RUN echo 'server {' > /etc/nginx/conf.d/default.conf && \
    echo '  listen 3000;' >> /etc/nginx/conf.d/default.conf && \
    echo '  server_name _;' >> /etc/nginx/conf.d/default.conf && \
    echo '  root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf && \
    echo '  index index.html index.htm;' >> /etc/nginx/conf.d/default.conf && \
    echo '  location / { try_files $uri $uri/ /index.html; }' >> /etc/nginx/conf.d/default.conf && \
    echo '  location ~* \.html?$ { add_header Cache-Control "no-cache, no-store, must-revalidate" always; }' >> /etc/nginx/conf.d/default.conf && \
    echo '  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { expires 1y; add_header Cache-Control "public, immutable" always; }' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -sf http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
