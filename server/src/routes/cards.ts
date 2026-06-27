import { Router, Request, Response } from 'express';
import { query } from '../db';
import { CardRow } from '../types';

const router = Router();

const CARDS_QUERY = `
WITH needed AS (
  SELECT card_name, SUM(quantity_needed) AS total_needed
  FROM deck_cards
  GROUP BY card_name
),
assigned_totals AS (
  SELECT card_name, SUM(quantity_assigned) AS assigned_total
  FROM assignments
  GROUP BY card_name
),
locations AS (
  SELECT
    agg.card_name,
    json_agg(
      json_build_object(
        'deck_id', agg.deck_id,
        'deck_name', d.name,
        'quantity_needed', agg.total_needed,
        'quantity_assigned', COALESCE(a.quantity_assigned, 0)
      ) ORDER BY d.name
    ) AS locations
  FROM (
    SELECT card_name, deck_id, SUM(quantity_needed) AS total_needed
    FROM deck_cards
    GROUP BY card_name, deck_id
  ) agg
  JOIN decks d ON d.id = agg.deck_id
  LEFT JOIN assignments a ON a.card_name = agg.card_name AND a.deck_id = agg.deck_id
  GROUP BY agg.card_name
)
SELECT
  n.card_name,
  COALESCE(cc.quantity_owned, 0)                                         AS owned,
  n.total_needed,
  GREATEST(0, n.total_needed - COALESCE(cc.quantity_owned, 0))           AS shortfall,
  COALESCE(at.assigned_total, 0)                                         AS assigned_total,
  COALESCE(cc.quantity_owned, 0) - COALESCE(at.assigned_total, 0)       AS unassigned,
  l.locations
FROM needed n
LEFT JOIN collection_cards cc ON cc.card_name = n.card_name
LEFT JOIN assigned_totals at ON at.card_name = n.card_name
LEFT JOIN locations l ON l.card_name = n.card_name
ORDER BY shortfall DESC, n.card_name ASC
`;

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query<CardRow>(CARDS_QUERY);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
