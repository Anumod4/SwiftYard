FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for typescript compiler)
RUN npm install

# Copy all source files
COPY . .

# Compile TypeScript to plain JavaScript using server-only tsconfig
RUN npx tsc -p tsconfig.server.json

# CRITICAL: package.json has "type": "module" for Vite/React, but tsc compiled
# the server to CommonJS. We must tell Node.js to run dist-server as CommonJS.
RUN echo '{"type":"commonjs"}' > dist-server/package.json

# Start using the pre-compiled JavaScript - instant startup, no tsx overhead
CMD ["node", "dist-server/server/index.js"]
