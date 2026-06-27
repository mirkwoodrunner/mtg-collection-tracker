import fetch from 'node-fetch';

const DECK_API = 'https://api.moxfield.com/v2/decks/all';
const COLLECTION_API = 'https://api2.moxfield.com/v1/collections/search';

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

interface MoxfieldCardEntry {
  quantity: number;
  card: { name: string; type?: string | number; type_line?: string };
}

// Moxfield returns card.type as a numeric enum, not a text type line
const MOXFIELD_TYPE_MAP: Record<number, string> = {
  3: 'Creature',
  4: 'Sorcery',
  5: 'Instant',
  6: 'Artifact',
  7: 'Enchantment',
  8: 'Land',
  9: 'Planeswalker',
  10: 'Battle',
};

function resolveCardType(card: { type?: string | number; type_line?: string }): string | null {
  if (card.type_line) return card.type_line;
  if (card.type == null) return null;
  const typeNum = typeof card.type === 'number' ? card.type : parseInt(String(card.type), 10);
  if (!isNaN(typeNum)) return MOXFIELD_TYPE_MAP[typeNum] ?? null;
  return String(card.type) || null;
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
  board: 'mainboard' | 'sideboard' | 'commander';
  cardType: string | null;
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

  const zones: Array<[string, Record<string, MoxfieldCardEntry> | undefined]> = [
    ['mainboard', data.mainboard],
    ['sideboard', data.sideboard],
    ['commander', data.commanders],
  ];

  const totals = new Map<string, DeckCard>();
  for (const [boardName, zone] of zones) {
    if (!zone) continue;
    const board = boardName as DeckCard['board'];
    for (const entry of Object.values(zone)) {
      const key = `${entry.card.name}|${board}`;
      const existing = totals.get(key);
      if (existing) {
        existing.quantity += entry.quantity;
      } else {
        totals.set(key, {
          cardName: entry.card.name,
          quantity: entry.quantity,
          board,
          cardType: resolveCardType(entry.card),
        });
      }
    }
  }

  return {
    name: data.name,
    cards: Array.from(totals.values()),
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

    if (!Array.isArray(data.data)) {
      throw new Error(
        `Unexpected Moxfield collection response shape (page ${page}): ` +
          JSON.stringify(data).slice(0, 300)
      );
    }

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
