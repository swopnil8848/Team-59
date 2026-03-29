# Mindtrail (Team 59) — Full Stack Project

## Description
Mindtrail is a gamified mental-health web experience built for the Nepal–US Hackathon 2026. The project includes:
- A **frontend** (Vite + TypeScript) with a pixel-art **2D Canvas game**, NPC dialogues, and a user dashboard.
- A **backend API** (NestJS + Prisma + PostgreSQL) for auth, game sessions, and progress reports.
- An **AI service** (FastAPI) used to generate NPC questions and progress-report insights.

## Screenshots / Demo
![Hub / Dashboard](./frontend/screenshot-hub.png)
![Gameplay](./frontend/screenshot-gameplay.png)
![Your Progress](./frontend/screenshot-progress.png)

## Repo Structure
- `frontend/` — Vite + TypeScript game UI
- `backend/` — NestJS API (Prisma + PostgreSQL + Swagger)
- `ai-backend/` — FastAPI service (OpenAI-based generation)
- `docs/backend-setup.md` — Original detailed backend setup notes

## Setup and Installation Instructions

### Prerequisites
- Node.js (20+ recommended) + npm
- PostgreSQL (14+)
- Python (3.12+ for `ai-backend/`)

Optional:
- Redis (used by the backend for prefetch/locking; see `backend/.env.example`)

---

### 1) Backend (NestJS API)
```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` (at minimum: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`, `AI_BACKEND_URL`).

Create DB + run migrations + seed:
```bash
cd backend
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run seed
```

Start backend:
```bash
cd backend
npm run start:dev
```

Backend URLs:
- API: `http://localhost:3001/api`
- Swagger UI: `http://localhost:3001/api/docs`
- Swagger JSON: `http://localhost:3001/api/docs-json`

---

### 2) AI Backend (FastAPI)
```bash
cd ai-backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Set your API key in `ai-backend/.env`:
```env
OPENAI_API_KEY=...
```

Run the service:
```bash
cd ai-backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

AI URLs (default):
- Health: `http://localhost:8000/health`
- Docs: `http://localhost:8000/docs`

Make sure `backend/.env` points `AI_BACKEND_URL` to this service, e.g.:
```env
AI_BACKEND_URL=http://localhost:8000
```

---

### 3) Frontend (Vite + TypeScript)
```bash
cd frontend
npm install
```

Configure dev proxy in `frontend/.env` (example):
```env
VITE_API_PROXY_TARGET=http://localhost:3001
VITE_API_PROXY_TIMEOUT_MS=300000
```

Run dev server:
```bash
cd frontend
npm run dev
```

Build:
```bash
cd frontend
npm run build
```

## Usage
1. Start the backend + AI backend.
2. Start the frontend.
3. Register / log in.
4. From the hub/dashboard:
   - Choose an avatar.
   - Enter the world and talk to NPCs.
   - Select answers (submitted to the backend).
5. When the game ends, the session is ended and a **progress report** is generated; open **YOUR PROGRESS** to view it.

## Technologies Used
**Frontend**
- TypeScript, Vite
- HTML Canvas (2D)
- Vanilla CSS

**Backend**
- NestJS (TypeScript)
- Prisma + PostgreSQL
- Swagger (OpenAPI)
- Redis (optional)

**AI Service**
- FastAPI + Uvicorn
- OpenAI SDK

## Team Members
- Bitisha Maharjan 
- Riya Maharjan 
- Swopnil Maharjan 
- Bijen Shrestha
- Suyan Shrestha 

## Contact / Notes
- Frontend proxy setup: `frontend/vite.config.ts` + `frontend/.env`
- Backend environment reference: `backend/.env.example`
- If you’re demoing without external network access, make sure the AI backend is running locally and `AI_BACKEND_URL` points to it.
