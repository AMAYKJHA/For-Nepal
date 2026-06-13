# 🎮 Scholar — Learn. Battle. Conquer Knowledge.

> **An AI-powered educational RPG that turns any PDF into a personalized battle game. Upload your study material, let AI generate 20 custom questions, then fight through four levels of enemies to master the content.**

[![Python](https://img.shields.io/badge/Python-Django%206-3776AB?style=flat&logo=python&logoColor=white)](https://djangoproject.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org)
[![Phaser](https://img.shields.io/badge/Phaser-4-orange?style=flat)](https://phaser.io)
[![Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-blue?style=flat&logo=google)](https://deepmind.google/technologies/gemini/)
[![Groq](https://img.shields.io/badge/AI-Groq%20LLaMA-green?style=flat)](https://groq.com)
[![License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Game Design](#-game-design)
- [AI Pipeline](#-ai-pipeline)
- [Database Models](#-database-models)
- [Team](#-team)

---

## 🧩 Overview

**Scholar** (built for the *For Nepal* hackathon) is a browser-based educational RPG that makes studying feel like playing a game. The platform has two distinct modes:

**🎮 Play Mode — QuizQuest**
Upload any PDF (textbook, syllabus, notes) and the AI instantly generates 20 custom questions across four difficulty tiers. Students then fight through a Phaser-powered battle arena where answering correctly damages the enemy and wrong answers damage the player. Four difficulty levels = four enemy stages = total topic mastery.

**💬 Chat Mode — ScholarAI**
An AI tutor backed by multiple LLMs (LLaMA 3.3 70B, Mixtral, Gemma 2) with persistent memory, spaced-repetition flashcards, semantic search over past Q&As, adaptive quizzes from uploaded PDFs, and a full concept-map knowledge graph.

---

## ✨ Features

### Play Mode (QuizQuest)
- **AI Quiz Generation** — Upload any PDF; Gemini 2.5 Flash generates 20 unique questions (5 per difficulty: Easy → Medium → Hard → Expert) with explanations
- **RPG Battle Engine** — Phaser 4 battle arena with Hero/Enemy/Boss entities, HP tracking, attack/shield mechanics, and animated effects
- **4-Level Progression** — Players unlock levels sequentially; cannot skip — mastery is earned
- **World Map** — Visual overworld with zone labels (Learning Sector → Survival Sector → Damage Sector), clickable level nodes, and live stats
- **Session Persistence** — Game state (HP, score, current level, status) saved to backend per session
- **Attempt Tracking** — Every question answer logged with `chosen_index`, `correct_index`, `is_correct`, and timestamp
- **Streak System** — Daily attempt streaks tracked per user with current/longest streak and day-by-day activity
- **Free Tier** — 5 games free; premium gate configurable via `FREE_GAMES` setting

### Chat Mode (ScholarAI)
- **Multi-Model Chat** — Switch between LLaMA 3.3 70B (versatile), LLaMA 3.1 8B (fast), Mixtral 8x7B (coding), Gemma 2 9B (reasoning) via Groq
- **Persistent Memory** — Q&A pairs stored with 3072-dimension vector embeddings (Gemini `embedding-001`) for semantic retrieval
- **Spaced Repetition Flashcards** — SM-2 algorithm schedules reviews; ratings: Again / Hard / Good / Easy
- **PDF Upload & RAG** — Upload PDFs → extract text → chunk by page → embed chunks → chat with document context via vector similarity search
- **Adaptive Quizzes** — AI generates Beginner/Intermediate/Advanced/Expert quizzes from PDF content
- **Topic Mastery** — Correct/incorrect counts per topic; mastery score = accuracy × confidence (confidence grows with sample size)
- **Concept Map** — Extracts concepts, definitions, and relationships from study material
- **Learning Analytics** — Per-topic accuracy, streak data, quiz attempt history

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 16)                │
│  ┌──────────────┐  ┌──────────────────────────────────────┐ │
│  │  Play Mode   │  │           Chat Mode                  │ │
│  │  ┌────────┐  │  │  Chat · Memory Vault · Flashcards    │ │
│  │  │Phaser 4│  │  │  Search · PDF Upload · Quizzes       │ │
│  │  │Battle  │  │  └──────────────────────────────────────┘ │
│  │  │Engine  │  │                                           │
│  │  └────────┘  │                                           │
│  │  World Map   │                                           │
│  └──────────────┘                                           │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST API (axios)
┌───────────────────────────▼─────────────────────────────────┐
│                    Backend (Django 6 + DRF)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │   /api/game/ │  │  /api/chat/  │  │  /api/auth/       │  │
│  │  Topic Upload│  │  Chat · RAG  │  │  Register · Login │  │
│  │  Sessions    │  │  Flashcards  │  └───────────────────┘  │
│  │  Attempts    │  │  Quizzes     │                         │
│  │  Streaks     │  │  PDF Chunks  │                         │
│  └──────┬───────┘  └──────┬───────┘                         │
│         │                 │                                 │
│  ┌──────▼─────────────────▼──────────────────────────────┐  │
│  │          Celery + Redis (async PDF processing)        │  │
│  └────────────────────────────────────────────────────────┘ │
└──────────────┬──────────────────────┬────────────────────────┘
               │                      │
     ┌──────────▼──────┐    ┌──────────▼──────────┐
     │   PostgreSQL    │   │  AI Models          │
    │   + pgvector     │   │  Gemini 2.5 Flash   │
    │  (3072-d embeds) │   │  Gemini Embedding   │
    └──────────────────┘   │Groq (LLaMA/Mixtral) │
                           └─────────────────────┘
```

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | Next.js 16 + React 19 | App router, SSR, routing |
| **Game Engine** | Phaser 4 | Battle scenes, animations, entities |
| **State Management** | Zustand | Chat, game, and user stores |
| **Data Fetching** | TanStack Query + Axios | API calls, caching |
| **Backend Framework** | Django 6 + DRF | REST API, ORM, admin |
| **Task Queue** | Celery + Redis | Async PDF processing |
| **Primary Database** | PostgreSQL + pgvector | Relational data + vector similarity search |
| **Vector Embeddings** | Gemini `embedding-001` (3072-d) | Semantic memory search |
| **Quiz Generation (Game)** | Gemini 2.5 Flash | 20-question RPG quiz from PDF |
| **Chat AI** | Groq (LLaMA 3.3 70B, Mixtral, Gemma 2) | Fast inference for tutor chat |
| **PDF Parsing** | PyMuPDF (fitz) | Text extraction by page |
| **API Docs** | drf-spectacular (Swagger + Redoc) | Auto-generated OpenAPI schema |
| **Static Files** | WhiteNoise | Production static serving |
| **Styling** | CSS Modules + Material Symbols | Pixel-retro dark fantasy design |

---

## 📁 Project Structure

```
amaykjha-for-nepal/
├── backend/
│   ├── config/                  # Django project settings, URLs, Celery, ASGI/WSGI
│   │   ├── settings.py          # Environment-driven config (DB, Redis, AI keys, CORS)
│   │   ├── urls.py              # Root URL routing → /api/auth, /api/chat, /api/game
│   │   └── celery.py            # Celery app (async PDF pipeline)
│   ├── src/
│   │   ├── accounts/            # Auth: register + login (Django User model)
│   │   ├── chat/                # RAG pipeline, flashcards, memory, quizzes, PDF processing
│   │   │   ├── models.py        # Memory, Flashcard, ChatSession, PDFDocument, PDFChunk, etc.
│   │   │   ├── utils.py         # Groq chat, embeddings, PDF chunking, SM-2, quiz generation
│   │   │   └── tasks.py         # Celery tasks: process_pdf_upload_task, generate_flashcards_task
│   │   └── game/                # QuizQuest RPG engine
│   │       ├── models.py        # UserProfile, Topic, GameSession, QuestionAttempt
│   │       ├── views.py         # topic_upload, topic_session, submit_game_state, save_attempt
│   │       ├── utils.py         # generate_quiz() → Gemini 2.5 Flash → validated JSON
│   │       └── GAME_PROMPT.txt  # System prompt for 20-question structured JSON output
│   ├── pyproject.toml           # Python dependencies (uv/pip)
│   └── .env.example             # Required environment variables
│
└── frontend/
    ├── src/
    │   ├── app/                 # Next.js App Router pages
    │   │   ├── page.jsx         # Landing: Play/Chat mode toggle
    │   │   ├── chat/            # Chat mode layout
    │   │   └── play/
    │   │       ├── upload/      # PDF upload → quiz generation → loading screen
    │   │       ├── world-map/   # Level selection overworld
    │   │       └── battle/      # Phaser game canvas
    │   ├── components/
    │   │   ├── play/            # PhaserGame, HPBar, QuestionBox, WorldMap, Victory, GameOver
    │   │   ├── chat/            # ChatView, Flashcards, MemoryVault, SearchMemory, ModelSelector
    │   │   └── ui/              # Button, Modal, Panel, ProgressBar, Tag
    │   ├── game/                # Phaser game internals
    │   │   ├── config.js        # Phaser.Game config factory
    │   │   ├── EventBridge.js   # React ↔ Phaser event bus
    │   │   ├── entities/        # Hero, Enemy, Boss classes
    │   │   ├── scenes/          # BootScene, BattleScene, UIScene
    │   │   └── animations/      # AttackEffect, DamageFloater, ShieldShatter
    │   ├── hooks/               # useChat, useGameSession, useLeaderboard, usePDFUpload
    │   ├── store/               # Zustand: chatStore, gameStore, userStore
    │   └── lib/                 # api.js (Axios), constants.js, queryClient.js
    └── package.json             # next, phaser, react, zustand, tanstack-query
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL (with `pgvector` extension) — or SQLite for local dev
- Redis (for Celery; optional if `ENABLE_ASYNC_TASKS=False`)
- API keys: Gemini and Groq

### Backend Setup

```bash
# 1. Clone the repo
git clone https://github.com/AMAYKJHA/For-Nepal.git
cd For-Nepal/backend

# 2. Install dependencies (using uv or pip)
pip install -e .          # reads pyproject.toml

# 3. Configure environment
cp .env.example .env
# Edit .env with your keys (see Environment Variables below)

# 4. Run migrations
python manage.py migrate

# 5. Start the server
python manage.py runserver
# API available at http://localhost:8000
# Swagger docs at http://localhost:8000/api/docs/
```

> **SQLite (quick start):** Set `LOCAL=True` in `.env` — no PostgreSQL needed. pgvector features (semantic search) will be unavailable.

**Optional — start Celery worker (async PDF processing):**
```bash
celery -A config worker --loglevel=info
```

### Frontend Setup

```bash
cd For-Nepal/frontend

# Install dependencies
npm install

# Configure API URL (optional — defaults to localhost:8000)
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start dev server
npm run dev
# App at http://localhost:3000
```

---

## 🔐 Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```env
# Django
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# AI Keys (required)
GEMINI_API_KEY=your_gemini_api_key        # for quiz generation + embeddings
GROQ_API_KEY=your_groq_api_key            # for chat responses + flashcard/quiz generation

# Database
LOCAL=True                                 # True = SQLite, False = PostgreSQL via DATABASE_URL
DATABASE_URL=postgresql://user:pass@host/dbname

# Async Tasks (optional)
ENABLE_ASYNC_TASKS=False                   # Set True to use Celery for PDF processing
REDIS_URL=rediss://...                     # Required only when ENABLE_ASYNC_TASKS=True
CELERY_BROKER_URL=rediss://...
CELERY_RESULT_BACKEND=rediss://...
```

---

## 📡 API Reference

The full interactive API is available at `/api/docs/` (Swagger UI) or `/api/redoc/` when the backend is running.

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login → returns user object |

### Game (QuizQuest)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/game/topics/upload` | Upload PDF → AI generates 20-question quiz |
| `GET` | `/api/game/users/{user_id}/topics` | List user's uploaded topics |
| `GET` | `/api/game/topics/{topic_id}/session` | Get or create a game session |
| `PATCH` | `/api/game/sessions/{session_id}/state` | Update HP, score, level, status |
| `POST` | `/api/game/sessions/{session_id}/attempts` | Record a question answer |
| `GET` | `/api/game/users/{user_id}/streak` | Daily attempt streak + activity calendar |

### Chat / RAG
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat/chat/` | Send message to ScholarAI |
| `GET` | `/api/chat/models/` | List available LLMs |
| `GET/POST` | `/api/chat/memories/` | Persistent memory store |
| `POST` | `/api/chat/search/` | Semantic memory search |
| `GET/POST` | `/api/chat/flashcards/` | Spaced-repetition flashcards |
| `POST` | `/api/chat/reviews/submit/` | Submit flashcard rating (SM-2) |
| `GET` | `/api/chat/mastery/` | Topic mastery scores |
| `POST` | `/api/chat/pdf/upload/` | Upload PDF for RAG |
| `POST` | `/api/chat/pdf/{id}/chat/` | Chat with a specific PDF |
| `GET` | `/api/chat/pdf/{id}/quiz/` | Get AI-generated quiz for PDF |
| `POST` | `/api/chat/pdf/{id}/quiz/submit/` | Submit quiz answers |

---

## 🎮 Game Design

### Battle Flow
1. Student uploads a PDF and gives the topic a name
2. Gemini 2.5 Flash generates exactly **20 questions** (5 per tier) in structured JSON
3. Student enters the **World Map** — four level nodes across three zones
4. In the **Battle Scene** (Phaser 4), an enemy throws a question at the player
5. Player picks from four options:
   - ✅ Correct → player attacks; enemy HP drops
   - ❌ Wrong → enemy attacks; player HP drops; explanation shown
6. Questions unlock sequentially — no skipping
7. Defeat the enemy to advance; defeat all four to master the topic

### Difficulty Tiers

| Level | Enemy | Focus |
|-------|-------|-------|
| Easy | Weak Creatures | Basic recall — definitions and facts |
| Medium | Stronger Foes | Applied understanding — cause and effect |
| Hard | Elite Enemies | Analysis — multi-step reasoning |
| Expert | Boss Battle | Synthesis — critique, edge cases, deep mastery |

### React ↔ Phaser Communication

The `EventBridge` (`src/game/EventBridge.js`) is a singleton `Phaser.Events.EventEmitter` that decouples React UI from Phaser scenes:

```js
// React triggers an attack
eventBridge.emit(GameEvents.PLAYER_ATTACK);

// Phaser listens and responds
eventBridge.on(GameEvents.HERO_HP_CHANGED, ({ hp, max }) => updateHPBar(hp, max));
```

---

## 🤖 AI Pipeline

### Game Quiz Generation (Gemini 2.5 Flash)
```
PDF upload → PyMuPDF text extraction → full text passed to Gemini
→ Structured JSON: { topic, levels: { easy[5], medium[5], hard[5], expert[5] } }
→ Each question: { question, options[4], correctOptionIndex, explanation }
→ Saved to Topic.quiz_data, status set to READY
```

The system prompt (`GAME_PROMPT.txt`) enforces strict JSON-only output, prompt injection defense, and all 10 generation rules including uniqueness, 4-option format, and mandatory explanations.

### Chat RAG Pipeline (Groq + Gemini Embeddings)
```
PDF upload → PyMuPDF → chunk by page (max 1500 chars, sentence boundaries)
→ embed each chunk via Gemini embedding-001 (3072-d) → stored in pgvector
→ On query: embed question → cosine similarity search → top-k chunks as context
→ Groq LLM generates answer grounded in retrieved chunks
```

### Spaced Repetition (SM-2)
Flashcard intervals are scheduled using the SM-2 algorithm. After each review, the ease factor, interval days, and next review date are updated based on the difficulty rating (Again=0, Hard=3, Good=4, Easy=5).

---

## 🗄 Database Models

### Game Module
| Model | Key Fields |
|-------|-----------|
| `UserProfile` | `user`, `free_games_used`, `is_premium` |
| `Topic` | `user`, `title`, `source_filename`, `quiz_data` (JSON), `status` |
| `GameSession` | `user`, `topic`, `current_level`, `player_hp`, `enemy_hp`, `score`, `status` |
| `QuestionAttempt` | `session`, `question_id`, `difficulty`, `chosen_index`, `correct_index`, `is_correct` |

### Chat Module
| Model | Key Fields |
|-------|-----------|
| `Memory` | `user`, `question`, `answer`, `topic`, `embedding` (3072-d), `importance_score` |
| `Flashcard` | `memory`, `front`, `back`, `ease_factor`, `interval_days`, `next_review_date` |
| `PDFDocument` | `title`, `summary`, `concepts`, `definitions`, `relationships`, `mastered` |
| `PDFChunk` | `document`, `content`, `page_number`, `embedding` (3072-d) |
| `PDFQuiz` | `document`, `difficulty`, `question`, `options`, `answer`, `explanation` |
| `TopicMastery` | `topic`, `mastery_score`, `correct_answers`, `incorrect_answers` |

---

## 👥 Team

Built with ❤️ for Nepal at a hackathon.

| Contributor | GitHub |
|-------------|--------|
| Amay Jha | [@AMAYKJHA](https://github.com/AMAYKJHA) |
| Bishal Shrestha | [@BishalABPS52](https://github.com/BishalABPS52) |
| Rojin Dhami | [@Rojin-Dhami](https://github.com/Rojin-Dhami) |
| Sandeep Khadka | [@sandeepkhadk](https://github.com/sandeepkhadk) |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

> *Study. Battle. Conquer. Learn. — Built for Nepal 🇳🇵*
