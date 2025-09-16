FROM node:20-alpine

# Install dependencies for pdf processing, health checks, native module compilation, and Keycloak
RUN apk add --no-cache \
    cairo \
    pango \
    giflib \
    jpeg \
    librsvg \
    curl \
    python3 \
    make \
    g++ \
    openssl \
    ca-certificates

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies first
RUN npm ci --only=production

# Install dev dependencies for building
RUN npm ci --only=development

# Copy application code
COPY . .

# Build frontend (requires dev dependencies)
RUN npm run build:frontend

# Clean up dev dependencies to keep image small
RUN npm prune --omit=dev

# Clear npm cache
RUN npm cache clean --force

# Rebuild native modules for the container architecture
RUN npm rebuild better-sqlite3 sqlite3

# Create required directories
RUN mkdir -p /app/data /app/uploads /app/living-pdfs /app/public

# Set permissions
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["npm", "start"]
