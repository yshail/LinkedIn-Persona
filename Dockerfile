# Use the official Microsoft Playwright image (it handles all system dependencies)
FROM mcr.microsoft.com/playwright:v1.49.0-noble

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install && npx playwright install chromium

# Copy the rest of your backend code
COPY . .

# Set the port (Cloud Run uses 8080)
ENV PORT=8080
EXPOSE 8080

# Run the server using tsx
CMD ["npx", "tsx", "src/server.ts"]
