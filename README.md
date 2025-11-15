# Proctoring Platform

React + Node + Firebase + Docker.

## Run locally (without Docker)

1. Set Firebase config in `frontend/.env.development`.
2. Set backend config in `backend/.env` and place `serviceAccountKey.json` in `backend/`.
3. In `backend/`: `npm install && npm run dev`.
4. In `frontend/`: `npm install && npm start`.

## Run with Docker

From `docker/` folder:

```bash
docker-compose up --build
