FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including recharts (using legacy-peer-deps for React 19 compatibility)
RUN npm cache clean --force && \
    npm install --legacy-peer-deps

# Copy source code
COPY . .

# Set environment variables
ENV VITE_API_BASE_URL=http://host.docker.internal:5001
ENV PORT=3000

EXPOSE 3000

# Start the development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
