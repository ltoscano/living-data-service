FROM node:20-alpine

# Install dependencies for pdf processing, health checks, and native module compilation
RUN apk add --no-cache \
    cairo \
    pango \
    giflib \
    jpeg \
    librsvg \
    curl \
    python3 \
    make \
    g++

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for building frontend)
RUN npm ci

# Copy application code
COPY . .

# Build frontend
RUN npm run build:frontend

# Remove dev dependencies to keep image small
RUN npm prune --omit=dev

# Rebuild native modules for the container architecture
RUN npm rebuild better-sqlite3

# Create required directories
RUN mkdir -p /app/data /app/uploads /app/living-pdfs

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
