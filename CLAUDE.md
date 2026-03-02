# Training Intelligence Agent

## Overview

An agentic AI training intelligence system that analyzes wearable biometric data and uses Retrieval-Augmented Generation (RAG) over sports science research to generate personalized training recommendations.

## Architecture

- **Backend**: FastAPI (Python 3.12) — `backend/`
- **Frontend**: Vite + React with Tailwind CSS — `frontend/`
- **AI**: Anthropic Claude (claude-sonnet-4-20250514) via the Anthropic SDK
- **Vector Store**: ChromaDB for RAG over sports science documents
- **Embeddings**: sentence-transformers for document/query embedding

## Backend Structure

```
backend/app/
├── main.py              # FastAPI app, CORS, router setup
├── api/routes/
│   ├── health.py        # GET /health
│   ├── biometrics.py    # POST /api/biometrics/upload, GET /api/biometrics/summary
│   └── recommendations.py  # POST /api/recommendations/generate
├── core/config.py       # Pydantic settings (env vars)
├── models/              # Pydantic data models
├── rag/                 # RAG pipeline (ChromaDB, embeddings, retrieval)
└── services/            # Business logic layer
```

## Key API Endpoints

- `GET /health` — Health check
- `POST /api/biometrics/upload` — Upload wearable biometric data (CSV/JSON)
- `GET /api/biometrics/summary` — Get latest biometric summary
- `POST /api/recommendations/generate` — Generate training recommendations via RAG

## Development

### Backend
```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Backend runs on port 8000, frontend on port 5173. The Vite dev server proxies `/api` and `/health` requests to the backend.

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and set:
- `ANTHROPIC_API_KEY` — Anthropic API key for Claude

## Conventions

- Backend uses FastAPI with async route handlers
- Config via pydantic-settings (reads from `.env`)
- Frontend uses Tailwind CSS v4 (imported via `@import "tailwindcss"` in index.css)
- CORS is configured to allow the Vite dev server origin (localhost:5173)
