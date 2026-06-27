import { Router, Request, Response } from 'express';
import { query } from '../db';
import { fetchDeck, fetchCollection } from '../moxfield';
import { Deck } from '../types';

const router = Router();

router.post('/', async (_req: Request, res: Response) => {
  try {
    const decksResult = await query<Deck>(
      'SELECT id, moxfield_public_id, name FROM decks ORDER BY name'
    );
    const decks = decksResult.rows;

    for (const deck of decks) {
      const { name, cards } = await fetchDeck(deck.moxfield_public_id);

      await query('DELETE FROM deck_cards WHERE deck_id = $1', [deck.id]);

      if (cards.length > 0) {
        const values = cards
          .map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`)
          .join(', ');
        const params: unknown[] = [deck.id];
        for (const c of cards) {
          params.push(c.cardName, c.quantity);
        }
        await query(
          `INSERT INTO deck_cards (deck_id, card_name, quantity_needed) VALUES ${values}`,
          params
        );
      }

      await query(
        `UPDATE decks SET name = $1, last_synced_at = NOW() WHERE id = $2`,
        [name, deck.id]
      );
    }

    const collectionPublicId = process.env.COLLECTION_PUBLIC_ID;
    if (!collectionPublicId) {
      res.status(500).json({ error: 'COLLECTION_PUBLIC_ID env var not set' });
      return;
    }

    const collectionCards = await fetchCollection(collectionPublicId);

    await query('TRUNCATE collection_cards');
    if (collectionCards.length > 0) {
      const values = collectionCards
        .map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`)
        .join(', ');
      const params: unknown[] = [];
      for (const c of collectionCards) {
        params.push(c.cardName, c.quantityOwned);
      }
      await query(
        `INSERT INTO collection_cards (card_name, quantity_owned) VALUES ${values}`,
        params
      );
    }

    res.json({
      success: true,
      decksUpdated: decks.length,
      collectionCardsUpdated: collectionCards.length,
    });
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
});

export default router;
