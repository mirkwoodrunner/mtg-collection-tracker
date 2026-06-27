import { Router, Request, Response } from 'express';
import { query } from '../db';
import { DeckCardDetail } from '../types';

const router = Router();

router.get('/:id/cards', async (req: Request, res: Response) => {
  const deckId = parseInt(req.params.id, 10);
  if (isNaN(deckId)) {
    res.status(400).json({ error: 'Invalid deck id' });
    return;
  }
  try {
    const result = await query<DeckCardDetail>(
      `SELECT
         dc.card_name,
         dc.board,
         dc.card_type,
         dc.quantity_needed,
         COALESCE(a.quantity_assigned, 0) AS quantity_assigned
       FROM deck_cards dc
       LEFT JOIN assignments a ON a.card_name = dc.card_name AND a.deck_id = dc.deck_id
       WHERE dc.deck_id = $1
       ORDER BY dc.board, dc.card_name`,
      [deckId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
