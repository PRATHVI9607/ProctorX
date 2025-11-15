# docker/backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY backend/package.json backend/package-lock.json* ./ 
RUN npm install

COPY backend ./backend

WORKDIR /app/backend

EXPOSE 5000

CMD ["npm", "start"]
