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
# This produces dist-server/server/index.js which runs instantly with node
RUN npx tsc -p tsconfig.server.json

# Start using the pre-compiled JavaScript - no tsx overhead, instant startup
CMD ["node", "dist-server/server/index.js"]
