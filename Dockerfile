FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including dev dependencies (needed for tsx)
RUN npm install

# Copy application source
COPY server/ ./server/
COPY turso.ts ./
COPY types.ts ./
COPY tsconfig.json ./

# Expose port (Cloud Run defaults to 8080)
EXPOSE 8080

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Start command
CMD ["npm", "run", "server"]
