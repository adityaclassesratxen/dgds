FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV VITE_API_BASE_URL=http://host.docker.internal:2070
ENV PORT=2050

EXPOSE 2050

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "2050"]
