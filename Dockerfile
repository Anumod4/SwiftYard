FROM node:20-alpine

# Install build tools for native modules
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for tsx/typescript)
RUN npm install

# Copy all source files
COPY . .

# Set environment
ENV NODE_ENV=production

# Cloud Run sets PORT=8080 automatically.
# Use tsx to run TypeScript directly - no compilation step needed.
# tsx handles the TypeScript-to-JS transpilation at runtime.
CMD ["./node_modules/.bin/tsx", "server/index.ts"]
