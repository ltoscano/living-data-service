FROM node:18-alpine

# Install dependencies for pdf processing
RUN apk add --no-cache \
    cairo \
    pango \
    giflib \
    jpeg \
    librsvg

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

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
