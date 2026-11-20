import { Router, Request, Response } from 'express';
import { query } from '../db';
import { Assignment } from '../types';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { card_name, deck_id, quantity_assigned } = req.body as {
      card_name: string;
      deck_id: number;
      quantity_assigned: number;
    };

    if (!card_name || !deck_id || quantity_assigned === undefined) {
      res.status(400).json({ error: 'card_name, deck_id, and quantity_assigned are required' });
      return;
    }

    if (quantity_assigned === 0) {
      await query(
        'DELETE FROM assignments WHERE card_name = $1 AND deck_id = $2',
        [card_name, deck_id]
      );
      res.json({ deleted: true });
      return;
    }

    if (quantity_assigned < 0) {
      res.status(400).json({ error: 'quantity_assigned must be >= 0' });
      return;
    }

    // Block any increase that would assign more copies than are owned.
    // Decreases are always allowed so existing over-allocations can be fixed.
    const check = await query<{ owned: number; others: number; current: number }>(
      `SELECT
         COALESCE((SELECT quantity_owned FROM collection_cards WHERE card_name = $1), 0) AS owned,
         COALESCE((SELECT SUM(quantity_assigned) FROM assignments
                   WHERE card_name = $1 AND deck_id <> $2), 0)::int AS others,
         COALESCE((SELECT quantity_assigned FROM assignments
                   WHERE card_name = $1 AND deck_id = $2), 0) AS current`,
      [card_name, deck_id]
    );
    const { owned, others, current } = check.rows[0];
    if (quantity_assigned > current && others + quantity_assigned > owned) {
      res.status(400).json({
        error: `Only ${Math.max(owned - others, 0)} of ${owned} copies of ${card_name} are unassigned`,
      });
      return;
    }

    const result = await query<Assignment>(
      `INSERT INTO assignments (card_name, deck_id, quantity_assigned)
       VALUES ($1, $2, $3)
       ON CONFLICT (card_name, deck_id)
       DO UPDATE SET quantity_assigned = EXCLUDED.quantity_assigned
       RETURNING *`,
      [card_name, deck_id, quantity_assigned]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
