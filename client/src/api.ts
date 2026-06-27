import type { Deck, CardRow, DeckCardDetail } from './types';

const BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const getDecks = (): Promise<Deck[]> =>
  fetch(`${BASE}/decks`).then((r) => handleResponse<Deck[]>(r));

export const addDeck = (urlOrId: string): Promise<Deck> =>
  fetch(`${BASE}/decks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      urlOrId.startsWith('http') ? { url: urlOrId } : { publicId: urlOrId }
    ),
  }).then((r) => handleResponse<Deck>(r));

export const deleteDeck = (id: number): Promise<{ success: boolean }> =>
  fetch(`${BASE}/decks/${id}`, { method: 'DELETE' }).then((r) =>
    handleResponse<{ success: boolean }>(r)
  );

export const triggerSync = (): Promise<{
  success: boolean;
  decksUpdated: number;
  collectionCardsUpdated: number;
}> =>
  fetch(`${BASE}/sync`, { method: 'POST' }).then((r) =>
    handleResponse<{ success: boolean; decksUpdated: number; collectionCardsUpdated: number }>(r)
  );

export const getCards = (): Promise<CardRow[]> =>
  fetch(`${BASE}/cards`).then((r) => handleResponse<CardRow[]>(r));

export const getDeckCards = (deckId: number): Promise<DeckCardDetail[]> =>
  fetch(`${BASE}/decks/${deckId}/cards`).then((r) => handleResponse<DeckCardDetail[]>(r));

export const setAssignment = (
  cardName: string,
  deckId: number,
  quantityAssigned: number
): Promise<unknown> =>
  fetch(`${BASE}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card_name: cardName, deck_id: deckId, quantity_assigned: quantityAssigned }),
  }).then((r) => handleResponse<unknown>(r));
