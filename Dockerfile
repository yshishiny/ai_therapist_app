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

# Copy nginx config
RUN mkdir -p /etc/nginx/conf.d

# Create nginx config for SPA routing
RUN echo 'server {\n\
  listen 3000;\n\
  server_name _;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
}' > /etc/nginx/conf.d/default.conf

RUN sed -i 's/listen 80/listen 3000/' /etc/nginx/conf.d/default.conf || true

# Copy built files
COPY --from=builder /build/dist /usr/share/nginx/html/

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
