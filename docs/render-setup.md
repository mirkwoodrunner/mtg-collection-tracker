# Deploying to Render

Step-by-step guide for setting up this app on Render's free tier.

## 1. Create a Postgres database

1. Log in to [render.com](https://render.com) and go to **New → PostgreSQL**
2. Fill in:
   - **Name**: `mtg-tracker-db`
   - **Database**: `mtg_tracker`
   - **Plan**: Free
3. Click **Create Database**
4. Once created, copy the **Internal Database URL** from the database detail page — you'll need it in step 3

## 2. Create a Web Service

1. Go to **New → Web Service**
2. Connect your GitHub repository (`mirkwoodrunner/mtg-collection-tracker`)
3. Fill in:
   - **Name**: `mtg-tracker`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node server/dist/index.js`
   - **Plan**: Free (or Starter for always-on)

## 3. Set environment variables

In the web service settings under **Environment**, add:

| Key | Value |
|---|---|
| `DATABASE_URL` | Internal Database URL from step 1 |
| `COLLECTION_PUBLIC_ID` | Your Moxfield collection public ID (see below) |
| `NODE_ENV` | `production` |

### Finding your COLLECTION_PUBLIC_ID

Your Moxfield collection must be set to **public**. To find the ID:

1. Open your Moxfield collection page in a browser
2. Open DevTools → Network tab
3. Refresh the page
4. Look for a request to `api2.moxfield.com/v1/collections/search/{someId}`
5. That `someId` is your `COLLECTION_PUBLIC_ID`

## 4. Deploy

Click **Create Web Service**. Render will build and deploy automatically.

The first deploy will:
1. Install dependencies
2. Build the client (Vite) and server (TypeScript)
3. Start the Express server, which runs `initDb()` to create all four tables

## 5. First sync

1. Navigate to your deployed app URL
2. Go to the **Decks** tab
3. Add your Moxfield decks by URL (e.g. `https://www.moxfield.com/decks/abc123`)
4. Click **Sync All** — this fetches all decks and your full collection from Moxfield
5. Switch to the **Cards** tab to see the shortfall view

## Notes on the free tier

- **Postgres**: Render free Postgres databases are **deleted after 90 days**. The app recreates all tables on startup, but your data (assignments) will be lost. Upgrade to a paid plan or export your assignments periodically if this matters to you.
- **Web service**: Free web services spin down after inactivity and have a cold-start delay of ~30s on first request. The Sync button may time out during a cold start — just wait and retry.
- **Render.yaml**: The `render.yaml` in the repo root describes this infrastructure. You can use it with Render Blueprints for one-click setup via the Render dashboard.
