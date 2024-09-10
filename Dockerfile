# Use the official Node.js image as the base image
FROM node:18-alpine AS base

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json into the container
COPY package*.json ./

# Install production dependencies
RUN npm install --only=production

# Copy the rest of the project files
COPY . .

# Compile TypeScript code
RUN npm run build

# Final stage to run the app
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy built files from the previous stage
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/package*.json ./

# Expose the port that your application will run on (if needed)
EXPOSE 3000

# Command to start the application
CMD ["node", "./dist/index.js"]
