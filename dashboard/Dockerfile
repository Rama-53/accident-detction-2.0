FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expose Vite port
EXPOSE 5173

# Run dev server with --host to expose to network
CMD ["npm", "run", "dev", "--", "--host"]
