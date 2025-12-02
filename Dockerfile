# Multi-stage build dla TripX - Frontend + Backend
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY vite.config.ts ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY index.html ./
COPY index.tsx ./
COPY index.css ./
COPY App.tsx ./
COPY TripXApp.tsx ./
COPY components ./components
COPY hooks ./hooks
COPY services ./services
COPY lib ./lib
COPY types ./types
COPY styles ./styles
COPY postcss.config.js ./
COPY tailwind.config.js ./
COPY vite-env.d.ts ./

# Build frontend
RUN npm run build

# Stage 2: Backend + Serve frontend
FROM node:20-alpine AS runtime

WORKDIR /app

# Install serve for static files
RUN npm install -g serve

# Copy backend package files
COPY server/package*.json ./server/

# Install backend dependencies
WORKDIR /app/server
RUN npm ci --production

# Copy backend source
COPY server/server.js ./
COPY server/routes ./routes
COPY server/services ./services
COPY server/utils ./utils
COPY server/middleware ./middleware
COPY server/abis ./abis

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/dist ./public

# Copy root files that backend might need
WORKDIR /app
COPY .env* ./

# Expose ports
# Backend API on 3002, Frontend on 3000
EXPOSE 3002 3000

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'cd /app/server && node server.js &' >> /app/start.sh && \
    echo 'cd /app/server/public && serve -s . -l 3000' >> /app/start.sh && \
    chmod +x /app/start.sh

# Start both services
CMD ["sh", "-c", "cd /app/server && node server.js & cd /app/server/public && serve -s . -l 3000 --wait"]


