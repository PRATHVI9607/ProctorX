# docker/frontend/Dockerfile
FROM node:18-alpine AS build

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./ 
RUN npm install

COPY frontend ./frontend

WORKDIR /app/frontend
RUN npm run build

FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/frontend/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
