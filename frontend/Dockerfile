FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

EXPOSE 5173

# Start Vite, binding to 0.0.0.0 to accessible from outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
