FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expose mobile dashboard port
EXPOSE 3000

# Run dev server with --host to expose to network
CMD ["npm", "run", "dev", "--", "--host"]
