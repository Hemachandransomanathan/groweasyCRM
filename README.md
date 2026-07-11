# GrowEasy CSV Lead Importer

An AI-powered CSV importer that maps leads from *any* CSV layout — Facebook Lead Ads,
Google Ads exports, real-estate CRMs, sales reports, hand-built spreadsheets — into
GrowEasy's fixed CRM schema, using an LLM (via Groq) for the field mapping.

Built for the GrowEasy Software Developer assignment.

## Stack

| Layer    | Tech |
|----------|------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, PapaParse |
| Backend  | Node.js, Express, Multer, csv-parse |
| AI       | Groq API (`openai/gpt-oss-120b`), batched extraction |

## How it works

1. **Upload** — user drags/selects a CSV. Nothing is sent to the server yet.
2. **Preview** — the file is parsed *client-side* with PapaParse and shown in a
   sticky-header, scrollable table (first 50 rows). No AI calls happen here.
3. **Confirm** — on click, the raw file is uploaded to `POST /api/extract`.
4. **AI Mapping** — the backend parses the CSV server-side, splits rows into
   batches (default 25 rows/batch), and sends each batch to Groq concurrently
   (default 3 batches at once) with a system prompt describing the GrowEasy CRM
   schema, the allowed enum values, and the field-mapping rules from the
   assignment (multi-email/phone handling, note consolidation, skip rule, etc).
5. **Results** — the frontend shows two tabs: successfully imported records and
   skipped records (rows with neither an email nor a mobile number), plus
   summary counts.

## Why this design

- **One prompt, many rows, batched** — rows are batched (not sent one at a time)
  to keep latency and cost reasonable, and batches run with bounded concurrency
  so a 1,000-row file doesn't fire 1,000 sequential requests. Each batch is
  independently retried with exponential backoff (`AI_MAX_RETRIES`, default 3)
  if Groq returns malformed JSON or the request fails — a single failed batch
  doesn't take down the whole import, it's reported in `failedBatches` instead.
- **Server-side validation, not blind trust** — the AI is instructed to only use
  allowed `crm_status`/`data_source` enum values, but the backend *also*
  re-validates every returned record (`src/utils/crmSchema.js`) and blanks
  anything outside the allow-list, strips raw newlines so records stay valid
  single CSV rows, and enforces the "skip if no email and no mobile" rule
  server-side rather than trusting the model to have done it.
- **Preview is 100% local** — parsing for preview uses PapaParse in the browser
  so users see their data instantly and no AI cost is incurred until they
  explicitly confirm.

## Project structure

```
groweasy-csv-importer/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express app entrypoint
│   │   ├── routes/
│   │   │   ├── extract.js        # POST /api/extract
│   │   │   └── health.js         # GET /api/health
│   │   ├── services/
│   │   │   ├── csvParser.js      # CSV -> row objects (source-agnostic)
│   │   │   └── aiExtractor.js    # Batching, Groq calls, retries
│   │   ├── middleware/
│   │   │   ├── upload.js         # Multer config (memory storage, 5MB limit)
│   │   │   └── errorHandler.js   # Central error + 404 handling
│   │   └── utils/
│   │       ├── crmSchema.js      # Schema, enums, sanitization/validation
│   │       └── crmSchema.test.js # Unit tests (node:test)
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── page.tsx              # Upload -> Preview -> Confirm -> Results flow
│   │   └── layout.tsx
│   ├── components/
│   │   ├── FileUpload.tsx        # Drag & drop + file picker
│   │   ├── PreviewTable.tsx      # Raw CSV preview (sticky headers)
│   │   ├── ResultsTable.tsx      # AI-mapped CRM records
│   │   ├── PipelineStepper.tsx   # Upload → Preview → AI Mapping → Import
│   │   ├── ProcessingState.tsx   # Loading state during AI extraction
│   │   └── StatCard.tsx
│   ├── lib/
│   │   ├── api.ts                # fetch wrapper for the backend
│   │   └── types.ts              # Shared CRM types
│   ├── Dockerfile
│   └── .env.local.example
├── samples/
│   └── facebook_lead_export_sample.csv
├── docker-compose.yml
└── README.md
```

## Setup

### Prerequisites
- Node.js 18+
- A [Groq API key](https://console.groq.com/keys)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# edit .env and set GROQ_API_KEY
npm run dev        # starts on http://localhost:4000
```

Run the unit tests:
```bash
npm test
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL should point at your backend (default http://localhost:4000)
npm run dev         # starts on http://localhost:3000
```

Open `http://localhost:3000`, upload `samples/facebook_lead_export_sample.csv` (or
any CSV) to try it end to end.

### 3. Docker (optional)

```bash
GROQ_API_KEY=gsk_xxxx docker compose up --build
```
Frontend on `:3000`, backend on `:4000`.

## Environment variables

**backend/.env**

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `4000` | |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | CORS allow-list |
| `GROQ_API_KEY` | — | required |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | |
| `AI_BATCH_SIZE` | `25` | rows per Groq request |
| `AI_CONCURRENCY` | `3` | concurrent batch requests |
| `AI_MAX_RETRIES` | `3` | retries per failed batch |
| `MAX_FILE_SIZE_MB` | `5` | upload limit |

**frontend/.env.local**

| Variable | Default |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` |

## API

### `POST /api/extract`
`multipart/form-data`, field name `file` (a `.csv`).

Response:
```json
{
  "sourceFile": "leads.csv",
  "sourceHeaders": ["Full Name", "Email Address", "..."],
  "totalRows": 120,
  "totalImported": 114,
  "totalSkipped": 6,
  "failedBatches": [],
  "imported": [ { "created_at": "...", "name": "...", "email": "...", "...": "..." } ],
  "skipped": [ { "record": { "...": "..." }, "reason": "Missing both email and mobile number" } ]
}
```

### `GET /api/health`
Simple liveness check.

## Deployment

No platform-specific config is bundled, but the app is deploy-ready as-is:
- **Frontend**: any Next.js host (Vercel, etc.) — set `NEXT_PUBLIC_API_URL` to the
  deployed backend URL.
- **Backend**: any Node host (Railway, Render, Fly.io, etc.) — set
  `GROQ_API_KEY` and `FRONTEND_ORIGIN` (your deployed frontend URL) as env vars.
- Both `Dockerfile`s and `docker-compose.yml` are included if you'd rather ship containers.

## Known limitations / next steps

- No database — the app is stateless by design (per the assignment's optional DB
  note). Results are not persisted after the browser session.
- No streaming progress per-batch to the frontend yet; the loading state is a
  single spinner rather than a live "batch 3/8" counter (batching/concurrency
  itself is implemented server-side).
- No auth — this is a self-contained demo, not wired into GrowEasy's actual login.
