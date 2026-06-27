import fetch from 'node-fetch';

const DECK_API = 'https://api.moxfield.com/v2/decks/all';
const COLLECTION_API = 'https://api2.moxfield.com/v1/collections/search';

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

interface MoxfieldCardEntry {
  quantity: number;
  card: { name: string };
}

interface MoxfieldDeckResponse {
  name: string;
  mainboard?: Record<string, MoxfieldCardEntry>;
  sideboard?: Record<string, MoxfieldCardEntry>;
  commanders?: Record<string, MoxfieldCardEntry>;
}

interface MoxfieldCollectionEntry {
  quantity: number;
  card: { name: string };
}

interface MoxfieldCollectionPage {
  totalPages: number;
  pageNumber: number;
  data: MoxfieldCollectionEntry[];
}

export interface DeckCard {
  cardName: string;
  quantity: number;
}

export interface CollectionCard {
  cardName: string;
  quantityOwned: number;
}

export async function fetchDeck(publicId: string): Promise<{ name: string; cards: DeckCard[] }> {
  const res = await fetch(`${DECK_API}/${publicId}`, {
    headers: { 'User-Agent': 'mtg-collection-tracker/1.0' },
  });
  if (!res.ok) {
    throw new Error(`Moxfield deck fetch failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as MoxfieldDeckResponse;

  const totals = new Map<string, number>();
  for (const zone of [data.mainboard, data.sideboard, data.commanders]) {
    if (!zone) continue;
    for (const entry of Object.values(zone)) {
      const name = entry.card.name;
      totals.set(name, (totals.get(name) ?? 0) + entry.quantity);
    }
  }

  return {
    name: data.name,
    cards: Array.from(totals.entries()).map(([cardName, quantity]) => ({ cardName, quantity })),
  };
}

export async function fetchCollection(collectionPublicId: string): Promise<CollectionCard[]> {
  const totals = new Map<string, number>();
  let page = 1;
  let totalPages = 1;

  do {
    const url =
      `${COLLECTION_API}/${collectionPublicId}` +
      `?sortType=cardName&sortDirection=ascending&pageNumber=${page}&pageSize=50` +
      `&playStyle=paperDollars&pricingProvider=tcgplayer`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'mtg-collection-tracker/1.0' },
    });
    if (!res.ok) {
      throw new Error(`Moxfield collection fetch failed (page ${page}): ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as MoxfieldCollectionPage;
    totalPages = data.totalPages;

    for (const entry of data.data) {
      const name = entry.card.name;
      totals.set(name, (totals.get(name) ?? 0) + entry.quantity);
    }

    page++;
    if (page <= totalPages) {
      await sleep(1000);
    }
  } while (page <= totalPages);

  return Array.from(totals.entries()).map(([cardName, quantityOwned]) => ({ cardName, quantityOwned }));
}
