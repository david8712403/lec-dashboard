# LEC Dashboard (Monorepo)

This repo contains a Next.js frontend and a NestJS + Fastify backend with Prisma (SQLite) and a Gemini CLI-powered AI assistant.

## Prerequisites

- Node.js 20+
- Python 3.8+ (for course-management skill)
- Gemini CLI installed and authenticated

## Setup

1. Install dependencies (workspace root):
   ```bash
   npm install
   ```
2. Configure backend environment:
   ```bash
   cp server/.env.example server/.env
   ```
   - Update `DATABASE_URL` if needed.
   - Set Gemini credentials (e.g. `GOOGLE_API_KEY`) or run `gemini auth login`.
3. Initialize Prisma:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

## Gemini CLI

Install the CLI (once):

```bash
npm install -g @google/gemini-cli
```

Authenticate:

```bash
gemini
```

Verify CLI works without API key:

```bash
gemini -m gemini-2.5-flash -p "ping" --output-format json
```

If you already logged in on this machine, make sure `~/.gemini/settings.json` includes:

```json
{
  "security": {
    "auth": { "selectedType": "oauth-personal" }
  }
}
```

## Run

- Start both frontend and backend:
  ```bash
  npm run dev
  ```

- Or separately:
  ```bash
  npm run dev:web
  npm run dev:server
  ```

Frontend defaults to `http://localhost:3003`, backend to `http://localhost:3004`.

## Environment Notes

- Frontend can override API base URL via `web/.env.local`:
  ```bash
  NEXT_PUBLIC_API_BASE_URL=http://localhost:3004
  ```
- The course-management skill lives in `server/skills/course-management`.

## Scripts

- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:seed`
