# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Layout

This is an npm workspaces monorepo with two packages and a root `package.json` that orchestrates them:

- `web/` — Next.js 15 + React 19 frontend (port 3003)
- `server/` — NestJS 10 backend using Fastify adapter (port 3004)

All `npm` commands should be run from the **repo root** using the workspace scripts below.

## Commands

```bash
# Install all dependencies (from root)
npm install

# Run both frontend and backend concurrently
npm run dev

# Run each workspace individually
npm run dev:web
npm run dev:server

# Build both workspaces
npm run build

# Lint the frontend
npm --workspace web run lint

# Prisma database operations
npm run prisma:generate   # regenerate Prisma client after schema changes
npm run prisma:migrate    # create and apply new migrations (dev mode)
npm run prisma:seed       # wipe and re-seed dev.db with sample data
```

There are no test suites configured in either workspace currently.

## Backend Architecture (`server/`)

**Framework stack:** NestJS with Fastify adapter, Prisma ORM, SQLite (`dev.db`).

All API routes are prefixed with `/api` (set via `app.setGlobalPrefix('api')` in `src/main.ts`).

### NestJS Modules

The app is split into four feature modules plus a shared `PrismaModule`:

| Module | Prefix | Responsibility |
|---|---|---|
| `DataModule` | `/api/{students,slots,sessions,payments,assessments}` | Full CRUD for all core entities. Used by the frontend for direct data manipulation. |
| `DashboardModule` | `/api/dashboard`, `/api/activity` | Single `GET /dashboard` that bulk-fetches all entities in one `Promise.all` call (what the frontend uses on load). `POST /activity` persists activity-log entries. |
| `AiModule` | `/api/ai/chat`, `/api/ai/chat/stream` | Gemini-powered chat. The non-streaming endpoint internally collects all stream events and returns the final message. The streaming endpoint writes SSE directly. |
| `ChatKitModule` | `/api/chatkit` | Implements the OpenAI ChatKit protocol. A single `POST /api/chatkit` endpoint routes by `body.type`. Streaming ops (thread creation, user messages, retries) use SSE; non-streaming ops (list, get, update, delete) return JSON. Internally delegates AI generation to `AiService`. |

### AI Pipeline (`src/ai/`)

The AI flow has three layers:

1. **`GeminiCliService`** — spawns the `gemini` CLI binary as a child process with `--output-format json`. Reads `GEMINI_MODEL` and `GEMINI_CLI_PATH` from env.
2. **`AiService`** — orchestrates a multi-step agentic loop (up to 3 iterations). It builds a Chinese-language prompt that instructs Gemini to output pure JSON with either `intent: "tool_call"` or `intent: "final"`. On `tool_call`, it invokes `SkillRunnerService` and feeds the result back into the next iteration.
3. **`SkillRunnerService`** — executes the actual tool actions against Prisma. All 17 supported actions (student CRUD, schedules, attendance, assessments, etc.) are implemented here as private methods. Student lookup (`resolveStudent`) accepts either an ID or a partial name match.

The prompt instructs Gemini to use Chinese for all user-facing replies. Error messages in the AI layer are also in Chinese.

### ChatKit Protocol Details

`ChatKitController` routes requests by `body.type`. The streaming operations (`threads.create`, `threads.add_user_message`, etc.) hijack the Fastify response and write SSE events. Tool calls from the AI are rendered as `widget`-type items with a Card layout containing the action name, args, and result as formatted JSON blocks. Thread titles are auto-generated from the first user message (truncated to 24 chars). Session scoping is done via the `x-chatkit-session` header persisted in `localStorage` on the frontend.

## Frontend Architecture (`web/`)

**Single-page app structure:** `app/page.tsx` renders `App.tsx`, which is a single `'use client'` component. There is no server-side rendering of data; all state is fetched client-side.

### Data Flow

On mount, `App.tsx` calls `GET /api/dashboard` once to hydrate all state (`students`, `slots`, `sessions`, `payments`, `assessments`, `activities`). Every mutation (create/update/delete) hits the corresponding `/api/{entity}` endpoint from `DataModule`, then re-fetches the full dashboard to refresh state. There is no client-side cache or optimistic updates.

### Views

The app is a tabbed SPA with five views, selected via `ViewState`:

| View | Component | Notes |
|---|---|---|
| `SCHEDULE` | `ScheduleGrid` | Weekly grid of fixed schedule slots with the ability to pre-book sessions |
| `DAILY_LOGS` | `DailyLogManager` | Per-session attendance and performance log editing |
| `STUDENTS` | `StudentManager` | Student list with per-student detail panels covering schedules, payments, assessments |
| `PAYMENTS` | `PaymentList` | Payment records with status management |
| `ACTIVITY_LOG` | `ActivityLog` | Read-only chronological activity log |

### AI Assistant Widget

`AIAssistant.tsx` uses `@openai/chatkit-react` (`ChatKit` + `useChatKit`). It connects to `/api/chatkit` and passes a per-browser session ID via a custom fetch wrapper. The widget is a fixed-position floating button in the bottom-right corner.

## Database Schema (`server/prisma/schema.prisma`)

Core entities: `Student`, `ScheduleSlot`, `Session`, `Payment`, `Assessment`, `ActivityLog`.

Chat entities: `ChatThread` and `ChatItem` (used by the ChatKit integration). `ChatItem.data` is a JSON column that stores the full ChatKit item payload (including widget definitions for tool-call cards).

All IDs are `String` (UUIDs generated via `randomUUID()` in application code, except seed data which uses short IDs like `'1'`, `'s1'`, `'ses1'`).

`Session` is overloaded: it stores both regular class attendance and leave records (distinguished by `attendance = '請假'` and `time_slot = '請假'`).

Assessment `metrics` is a JSON object using a `"Y-M"` string format for developmental ages (e.g., `"4-6"` means 4 years 6 months). `compare_assessments` parses these into months for diff calculation.

## Environment Configuration

Copy `server/.env.example` to `server/.env`. Key variables:

- `DATABASE_URL` — defaults to `file:./dev.db` if unset
- `GEMINI_MODEL` — defaults to `gemini-2.5-flash`
- `GEMINI_CLI_PATH` — path to the `gemini` binary; defaults to `gemini` on PATH
- `GEMINI_CLI_SYSTEM_SETTINGS_PATH` — path to the settings JSON (see `server/gemini-settings.json`)

Frontend API base URL is configured via `NEXT_PUBLIC_API_BASE_URL` in `web/.env.local` (defaults to `http://localhost:3004`).

## Gemini CLI Setup

The backend shells out to the `gemini` CLI (not an HTTP API client). It must be installed globally (`npm install -g @google/gemini-cli`) and authenticated (`gemini auth login`). The settings file at `server/gemini-settings.json` pins OAuth personal auth and disables telemetry. If the CLI is not on PATH, set `GEMINI_CLI_PATH`.
