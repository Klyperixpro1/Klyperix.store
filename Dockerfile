FROM node:20-bookworm-slim

# Install Chromium and system dependencies required for Puppeteer & WhatsApp Web
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-freefont-ttf \
    fonts-ipafont-gothic \
    fonts-kacst \
    fonts-liberation \
    fonts-thai-tlwg \
    fonts-wqy-zenhei \
    ca-certificates \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    && rm -rf /var/lib/apt/lists/*

# Environment variables for Puppeteer and Cloud execution
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PORT=3001 \
    DATABASE_PATH=/app/data/leads.db \
    WWEBJS_AUTH_PATH=/app/data/.wwebjs_auth

WORKDIR /app

# Create persistent data directory
RUN mkdir -p /app/data

# Copy package manifests
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install all dependencies (including devDependencies needed for TypeScript & Vite build)
RUN npm install --include=dev
RUN cd server && npm install --include=dev
RUN cd client && npm install --include=dev

# Copy source code
COPY server/ ./server/
COPY client/ ./client/

# Build client (Vite -> client/dist) and server (TypeScript -> server/dist)
RUN cd client && npm run build
RUN cd server && npm run build

# Set production mode for runtime
ENV NODE_ENV=production

# Expose default application port
EXPOSE 3001

# Start the unified backend & static frontend server
CMD ["node", "server/dist/index.js"]
