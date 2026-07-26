# Build stage
FROM node:18-alpine AS builder

WORKDIR /build

COPY portal/package*.json ./
RUN npm ci --prefer-offline --no-audit

COPY portal/ .

ENV VITE_API_URL=https://ai-therapist-backend-827557836856.us-central1.run.app
ENV VITE_APP_NAME="AI Therapist Portal"
ENV VITE_ACCESS_TOKEN_TTL_MINUTES=30
ENV VITE_GOOGLE_CLIENT_ID=827557836856-7rvgsjntvrca29n7slj6lmhat53cpefg.apps.googleusercontent.com

RUN npm run build

# Runtime stage
FROM nginx:alpine

RUN apk add --no-cache curl

COPY public /usr/share/nginx/html/
COPY --from=builder /build/dist /usr/share/nginx/html/

# Nginx config template for SPA routing (uses $PORT at runtime for Cloud Run compatibility)
RUN echo 'server {' > /etc/nginx/conf.d/default.conf.template && \
    echo '  listen PORT_PLACEHOLDER;' >> /etc/nginx/conf.d/default.conf.template && \
    echo '  server_name _;' >> /etc/nginx/conf.d/default.conf.template && \
    echo '  root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf.template && \
    echo '  index index.html index.htm;' >> /etc/nginx/conf.d/default.conf.template && \
    echo '  location / { try_files $uri $uri/ /index.html; }' >> /etc/nginx/conf.d/default.conf.template && \
    echo '  location ~* \.html?$ { add_header Cache-Control "no-cache, no-store, must-revalidate" always; }' >> /etc/nginx/conf.d/default.conf.template && \
    echo '  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { expires 1y; add_header Cache-Control "public, immutable" always; }' >> /etc/nginx/conf.d/default.conf.template && \
    echo '}' >> /etc/nginx/conf.d/default.conf.template

# Entrypoint script: substitute $PORT (Cloud Run sets this; defaults to 3000 for local/Railway use)
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-substitute-port.sh && \
    echo 'PORT="${PORT:-3000}"' >> /docker-entrypoint.d/40-substitute-port.sh && \
    echo 'sed "s/PORT_PLACEHOLDER/$PORT/" /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf' >> /docker-entrypoint.d/40-substitute-port.sh && \
    chmod +x /docker-entrypoint.d/40-substitute-port.sh

EXPOSE 3000
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -sf http://localhost:${PORT:-3000}/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
