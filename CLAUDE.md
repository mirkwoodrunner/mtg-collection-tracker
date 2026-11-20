# MTG Collection Tracker — Developer Guide

## Tech stack

- **Backend**: Node.js + Express + TypeScript (`server/`)
- **Frontend**: React + Vite + TypeScript (`client/`)
- **Database**: PostgreSQL via `pg` (node-postgres)
- **Hosting**: Render (single web service + Postgres)
- **Structure**: npm workspaces monorepo

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string |
| `COLLECTION_PUBLIC_ID` | Yes | Moxfield collection public ID |
| `PORT` | No | Server port (default 3001) |
| `NODE_ENV` | No | Set to `production` on Render |

Copy `.env.example` to `.env` and fill in values for local development.

## Dev commands

```bash
npm install                  # install all workspace deps
npm run dev:server           # start Express on :3001 (ts-node-dev, hot reload)
npm run dev:client           # start Vite dev server on :5173 (proxies /api to :3001)
npm run build                # production build: client then server
npm run typecheck --workspace=server   # TypeScript check server only
```

## Architecture

### Key files

- `server/src/moxfield.ts` — **the only file that talks to Moxfield**. `fetchDeck(publicId)` and `fetchCollection(collectionPublicId)`. Never parallelize calls here — always 1 req/sec.
- `server/src/routes/cards.ts` — the core business logic: a multi-CTE SQL query that computes owned/needed/shortfall/assigned/locations for every card in one round-trip.
- `server/src/schema.sql` — applied idempotently (`IF NOT EXISTS`) at every server startup via `initDb()`.
- `client/src/api.ts` — all typed fetch wrappers for the app's own API endpoints.
- `client/src/components/AssignmentStepper.tsx` — the interactive assignment editor with optimistic updates and 500ms debounce.

### Data model

Four tables:

- `decks` — tracked decks, one row per Moxfield deck
- `deck_cards` — flattened card requirements; **truncated and rebuilt on every sync**
- `collection_cards` — flattened collection totals; **truncated and rebuilt on every sync**
- `assignments` — **the only table with real persistent user state**; never wiped by sync

### Sync behavior

`POST /api/sync` re-fetches all tracked decks and the collection from Moxfield and replaces `deck_cards` and `collection_cards` wholesale. `assignments` is never touched by sync — it's the user's manual bookkeeping and must survive all syncs.

### Card name matching

Cards are matched by `card.name` string only. Foil/nonfoil, printing, and binder are ignored. The same card name may appear in multiple collection entries (different printings/binders) — the collection fetch sums quantities across all of them.

### Over-allocation

Assigning more copies of a card than are owned is not allowed. `POST /api/assignments` rejects (400) any increase that would push `SUM(assignments.quantity_assigned)` past `collection_cards.quantity_owned`. Decreases are always accepted. The client disables the `+` stepper when a card has no unassigned copies, and the deck page only offers "+ Add 1" (from the binder) when `unassigned > 0`. Transfers between decks are sent as decrement-source then increment-target, so they never trip the check.

## Moxfield API endpoints used

- `GET https://api.moxfield.com/v2/decks/all/{publicId}` — deck with mainboard/sideboard/commanders
- `GET https://api2.moxfield.com/v1/collections/search/{collectionPublicId}?sortType=cardName&sortDirection=ascending&pageNumber={n}&pageSize=50&playStyle=paperDollars&pricingProvider=tcgplayer` — paginated collection

Both are undocumented and require no auth (anonymous GET, decks/collection must be public). Treat as unstable.

## Production (Render)

- Build: `npm install && npm run build`
- Start: `node server/dist/index.js`
- The Express server serves `client/dist/` as static files, with `*` fallback to `index.html`
- DB tables are created automatically at startup — no manual migration step needed
- See `docs/render-setup.md` for full setup walkthrough
