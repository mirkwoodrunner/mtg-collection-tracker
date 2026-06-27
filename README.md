# MTG Collection Tracker

A single-user tool that pulls your public Moxfield decks and collection, computes card shortfalls across all tracked decks at once, and lets you manually assign which deck each physical copy belongs to — so you know exactly what to swap when you want to play a different deck.

Moxfield can tell you whether you own enough cards to build one deck. This tool tracks the harder problem: the 3 copies of a card you own may already be spoken for by two other decks you've built.

## Setup

### Prerequisites

- Node.js 18+
- A PostgreSQL database (Render free tier works fine)
- Your Moxfield collection must be set to **public**

### Local development

```bash
# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env
# Edit .env: set DATABASE_URL and COLLECTION_PUBLIC_ID

# Start the backend (port 3001 by default)
npm run dev:server

# In a separate terminal, start the frontend (port 5173 by default)
npm run dev:client
```

The Vite dev server proxies `/api` requests to the Express server, so no CORS configuration is needed.

### Finding your COLLECTION_PUBLIC_ID

Navigate to your Moxfield collection page. The public ID is in the URL:
`https://www.moxfield.com/users/YourUsername/collection` → look at the network tab for requests to `api2.moxfield.com/v1/collections/search/{publicId}`. That's the ID to use.

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `COLLECTION_PUBLIC_ID` | Your Moxfield collection's public ID |
| `PORT` | Server port (default: 3001) |
| `NODE_ENV` | Set to `production` on Render |

## Production build

```bash
npm run build
node server/dist/index.js
```

The Express server serves the built Vite frontend as static files in production.

## Deploy to Render

See [`docs/render-setup.md`](docs/render-setup.md) for step-by-step instructions.

## Moxfield API note

This tool uses Moxfield's **undocumented internal API** (`api.moxfield.com` / `api2.moxfield.com`) — the same endpoints their website calls. It works with anonymous GET requests against public decks and collections, but the API is unstable and could change without notice. The app caches all data in Postgres and only hits Moxfield when you manually trigger a sync.

