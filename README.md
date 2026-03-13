# TentaKung — AI-Powered Flashcard App

A full-stack flashcard app built with **Next.js 14 (App Router)**, **Supabase**, **Tailwind CSS**, **Shadcn UI**, and **OpenAI**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 + TypeScript (App Router) |
| Database & Auth | Supabase (PostgreSQL + RLS) |
| UI | Tailwind CSS v4 + Shadcn UI |
| Icons | Lucide React |
| AI | OpenAI GPT-4o-mini |
| PDF Parsing | pdf-parse |

---

## Features

- **Auth** – Email/Password + Google OAuth via Supabase Auth
- **Dashboard** – Manage all your quiz decks with stats overview
- **Quiz CRUD** – Create, edit, delete quizzes and individual cards
- **AI Generation** – Upload a PDF or paste text → AI creates a full flashcard deck
- **Flashcard Mode** – Animated 3D flip cards to memorize content
- **Quiz Mode** – MCQ with instant feedback and final score screen
- **Privacy & Sharing** – Quizzes are private by default; toggle Public to appear in Explore feed. Anyone with the link can always view.
- **Explore Feed** – Browse all public decks with search

---

## Setup

### 1. Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. In **Authentication > Providers**, enable **Email** and **Google** (add your Google OAuth credentials)
4. In **Authentication > URL Configuration**, add `http://localhost:3000/auth/callback` to the Redirect URLs

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-your-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database Schema

### `quizzes`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | FK → auth.users |
| title | text | Quiz title |
| description | text? | Optional description |
| is_public | boolean | Show in Explore feed |
| card_count | integer | Auto-maintained by trigger |
| created_at | timestamptz | |
| updated_at | timestamptz | Auto-updated by trigger |

### `cards`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| quiz_id | uuid | FK → quizzes |
| question | text | The question |
| answer | text | The answer |
| options | jsonb? | MCQ options array (includes correct answer) |
| position | integer | Display order |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `profiles`
Auto-created on signup via database trigger.

---

## Routes

| Route | Description |
|---|---|
| `/` | Landing page |
| `/login` | Sign in (email + Google) |
| `/signup` | Create account |
| `/dashboard` | Your quiz decks (protected) |
| `/quiz/[id]` | View/edit a quiz and its cards |
| `/quiz/[id]/study` | Flashcard + Quiz study modes |
| `/explore` | Public quiz feed with search |
| `/api/ai/generate` | POST – AI flashcard generation endpoint |
| `/auth/callback` | OAuth callback handler |
