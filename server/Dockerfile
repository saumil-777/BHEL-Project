FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy remaining server code
COPY . .

# Create uploads folder
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "src/app.js"]
