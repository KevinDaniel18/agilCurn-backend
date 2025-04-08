FROM node:23-alpine3.20

WORKDIR /app

# Copy package files first for faster installs
COPY package*.json ./
RUN npm install

# Copy the entire project, including prisma directory
COPY . .

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 3000

CMD [ "npm", "run", "start:dev" ]
