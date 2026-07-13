# Use official Node.js runtime image
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy server code and database models
COPY server/ ./server/

# Expose port (Cloud Run automatically binds this to the PORT environment variable)
EXPOSE 3001

# Start the application
CMD ["npm", "run", "server"]
