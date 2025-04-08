FROM node:20-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y openssl libssl1.1 ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy package files first for faster installs
COPY package*.json ./
RUN npm install

# Copy the entire project, including prisma directory
COPY . .

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 3000

CMD [ "npm", "run", "start:dev" ]
