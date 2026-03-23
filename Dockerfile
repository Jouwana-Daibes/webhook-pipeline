# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including dev dependencies
RUN npm install --legacy-peer-deps

# Copy all source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port (API only)
EXPOSE 3000

# Default command (API)
CMD ["node", "dist/api/server.js"]
