import { Router } from 'express';
import { query } from '../db';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const result = await query<{
      card_name: string;
      type_line: string | null;
      oracle_text: string | null;
      colors: string;
      power: string | null;
      toughness: string | null;
      deck_names: string[];
    }>(`
      SELECT
        dt.card_name,
        dt.type_line,
        dt.oracle_text,
        dt.colors,
        dt.power,
        dt.toughness,
        array_agg(d.name ORDER BY d.name) AS deck_names
      FROM deck_tokens dt
      JOIN decks d ON d.id = dt.deck_id
      GROUP BY dt.card_name, dt.type_line, dt.oracle_text, dt.colors, dt.power, dt.toughness
      ORDER BY dt.card_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/tokens error:', err);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

export default router;
