import { Router, Request, Response } from 'express';
import { query } from '../db';
import { fetchDeck } from '../moxfield';
import { Deck } from '../types';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query<Deck>(
      'SELECT id, moxfield_public_id, name, last_synced_at FROM decks ORDER BY name'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { url, publicId: rawId } = req.body as { url?: string; publicId?: string };

    let publicId = rawId?.trim();
    if (!publicId && url) {
      const match = url.match(/decks\/([a-zA-Z0-9_-]+)/);
      if (!match) {
        res.status(400).json({ error: 'Could not parse Moxfield deck public ID from URL' });
        return;
      }
      publicId = match[1];
    }
    if (!publicId) {
      res.status(400).json({ error: 'Provide url or publicId' });
      return;
    }

    const { name, cards } = await fetchDeck(publicId);

    const insertDeck = await query<Deck>(
      `INSERT INTO decks (moxfield_public_id, name, last_synced_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (moxfield_public_id) DO UPDATE SET name = EXCLUDED.name, last_synced_at = NOW()
       RETURNING *`,
      [publicId, name]
    );
    const deck = insertDeck.rows[0];

    if (cards.length > 0) {
      await query(`DELETE FROM deck_cards WHERE deck_id = $1`, [deck.id]);
      const values = cards
        .map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`)
        .join(', ');
      const params: unknown[] = [deck.id];
      for (const c of cards) {
        params.push(c.cardName, c.quantity);
      }
      await query(
        `INSERT INTO deck_cards (deck_id, card_name, quantity_needed) VALUES ${values}
         ON CONFLICT (deck_id, card_name) DO UPDATE SET quantity_needed = EXCLUDED.quantity_needed`,
        params
      );
    }

    res.status(201).json(deck);
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await query('DELETE FROM decks WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
