import { Router, Request, Response } from 'express';
import { syncDecks, syncCollection } from '../syncService';

const router = Router();

router.post('/', async (_req: Request, res: Response) => {
  try {
    const decksUpdated = await syncDecks();
    const collectionCardsUpdated = await syncCollection();
    res.json({ success: true, decksUpdated, collectionCardsUpdated });
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
});

export default router;
