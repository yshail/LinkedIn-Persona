# Use the official Microsoft Playwright image
FROM mcr.microsoft.com/playwright:v1.49.0-noble

# Set the working directory
WORKDIR /app

# Copy all package files
COPY package*.json ./
COPY Backend/package*.json ./Backend/
COPY Frontend/package*.json ./Frontend/

# Install root dependencies
RUN npm install

# Install sub-project dependencies
RUN npm install --prefix Backend
RUN npm install --prefix Frontend

# Install browser
RUN npx playwright install chromium

# Copy everything
COPY . .

# Build Frontend
RUN npm run build --prefix Frontend

# Build Backend
RUN npm run build --prefix Backend

# Railway uses PORT variable
ENV PORT=8080
EXPOSE 8080

# Start the monolith
CMD ["npm", "start"]
