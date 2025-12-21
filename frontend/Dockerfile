FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clear npm cache and install dependencies
RUN npm cache clean --force && \
    npm install

# Copy source code
COPY . .

# Set environment variables
ENV VITE_API_BASE_URL=http://host.docker.internal:2070
ENV PORT=2050

EXPOSE 2050

# Start the development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "2050"]
