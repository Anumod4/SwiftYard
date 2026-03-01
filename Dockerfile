FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including dev dependencies (needed for tsc)
RUN npm install

# Copy all application source files
COPY . .

# Start command using standard tsx. Use explicit binding on 0.0.0.0
CMD ["npx", "tsx", "server/index.ts"]
