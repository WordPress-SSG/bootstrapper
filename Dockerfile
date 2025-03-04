# Use an official Debian-based Node.js image as the base
FROM node:18-bullseye

# Set the working directory in the container
WORKDIR /app

# Install Yarn globally
RUN corepack enable && corepack prepare yarn@stable --activate

# Copy package.json and yarn.lock first to optimize caching
COPY package.json yarn.lock ./

# Install dependencies using Yarn
RUN yarn

# Copy the rest of the application files
COPY src src
COPY tsconfig.json .

# Build TypeScript files
RUN npx tsc

# Expose the application port
EXPOSE 3000

# Command to start the application
CMD ["node", "dist/index.js"]
