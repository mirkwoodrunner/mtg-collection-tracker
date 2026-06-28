import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDb } from './db';
import { syncCollection } from './syncService';
import decksRouter from './routes/decks';
import deckCardsRouter from './routes/deckCards';
import syncRouter from './routes/sync';
import cardsRouter from './routes/cards';
import assignmentsRouter from './routes/assignments';
import tokensRouter from './routes/tokens';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.use('/api/decks', decksRouter);
app.use('/api/decks', deckCardsRouter);
app.use('/api/sync', syncRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/tokens', tokensRouter);

if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(staticPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  syncCollection()
    .then((n) => console.log(`Startup collection sync: ${n} cards`))
    .catch((err) => console.error('Startup collection sync failed:', err));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
