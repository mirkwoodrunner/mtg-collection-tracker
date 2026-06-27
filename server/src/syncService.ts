import { query } from './db';
import { fetchCollection, fetchDeck } from './moxfield';
import { Deck } from './types';

export async function syncCollection(): Promise<number> {
  const collectionPublicId = process.env.COLLECTION_PUBLIC_ID;
  if (!collectionPublicId) throw new Error('COLLECTION_PUBLIC_ID env var not set');

  const cards = await fetchCollection(collectionPublicId);

  await query('TRUNCATE collection_cards');
  if (cards.length > 0) {
    const values = cards.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ');
    const params: unknown[] = [];
    for (const c of cards) {
      params.push(c.cardName, c.quantityOwned);
    }
    await query(`INSERT INTO collection_cards (card_name, quantity_owned) VALUES ${values}`, params);
  }

  return cards.length;
}

export async function syncDecks(): Promise<number> {
  const decksResult = await query<Deck>('SELECT id, moxfield_public_id, name FROM decks ORDER BY name');
  const decks = decksResult.rows;

  for (const deck of decks) {
    const { name, cards } = await fetchDeck(deck.moxfield_public_id);

    await query('DELETE FROM deck_cards WHERE deck_id = $1', [deck.id]);

    if (cards.length > 0) {
      const values = cards.map((_, i) => `($1, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4}, $${i * 4 + 5})`).join(', ');
      const params: unknown[] = [deck.id];
      for (const c of cards) {
        params.push(c.cardName, c.quantity, c.board, c.cardType);
      }
      await query(`INSERT INTO deck_cards (deck_id, card_name, quantity_needed, board, card_type) VALUES ${values}`, params);
    }

    await query('UPDATE decks SET name = $1, last_synced_at = NOW() WHERE id = $2', [name, deck.id]);
  }

  return decks.length;
}
