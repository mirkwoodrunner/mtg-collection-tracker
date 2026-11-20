import { useEffect, useMemo, useState } from 'react';
import { getCards, getDeckCards, setAssignment, deleteDeck } from '../api';
import type { Deck, CardRow, CardLocation, DeckCardDetail } from '../types';
import { BASIC_LANDS } from '../cardUtils';

const TYPE_ORDER = [
  'Creature', 'Planeswalker', 'Battle', 'Instant', 'Sorcery',
  'Enchantment', 'Artifact', 'Land', 'Other',
];

// Which category wins when a card has several types (e.g. Artifact Creature).
const TYPE_PRIORITY = [
  'Land', 'Creature', 'Planeswalker', 'Artifact', 'Enchantment', 'Battle',
  'Instant', 'Sorcery',
];

function primaryType(cardType: string | null): string {
  if (!cardType) return 'Other';
  const upper = cardType.split('—')[0].trim();
  for (const t of TYPE_PRIORITY) if (upper.includes(t)) return t;
  return 'Other';
}

function plural(type: string): string {
  if (type === 'Sorcery') return 'Sorceries';
  if (type === 'Other') return 'Other';
  return `${type}s`;
}

interface Row extends DeckCardDetail {
  inBox: number; // copies of this row covered by the deck's assignment
}

interface Props {
  deckId: number;
  decks: Deck[];
  decksLoading: boolean;
  onRemoved: () => void;
}

export default function DeckViewPage({ deckId, decks, decksLoading, onRemoved }: Props) {
  const deck = decks.find((d) => d.id === deckId);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [details, setDetails] = useState<DeckCardDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shortOnly, setShortOnly] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([getCards(), getDeckCards(deckId)])
      .then(([c, d]) => { setCards(c); setDetails(d); })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [deckId]);

  const cardMap = useMemo(() => {
    const m = new Map<string, CardRow>();
    for (const c of cards) m.set(c.card_name, c);
    return m;
  }, [cards]);

  // One assignment count per deck. When a card sits on more than one board,
  // fill commander, then main, then sideboard rows in that order.
  const rows = useMemo(() => {
    const boardRank = (b: string) => (b === 'commander' ? 0 : b === 'sideboard' ? 2 : 1);
    const sorted = [...details].sort((a, b) => boardRank(a.board) - boardRank(b.board));
    const remaining = new Map<string, number>();
    const out: Row[] = [];
    for (const d of sorted) {
      const left = remaining.get(d.card_name) ?? Number(d.quantity_assigned);
      const inBox = Math.min(left, Number(d.quantity_needed));
      remaining.set(d.card_name, left - inBox);
      out.push({ ...d, inBox });
    }
    return out;
  }, [details]);

  // Basic lands count toward the deck size but are always treated as in the box.
  const boxed = (r: Row) => (BASIC_LANDS.has(r.card_name) ? Number(r.quantity_needed) : r.inBox);
  const total = rows.reduce((s, r) => s + Number(r.quantity_needed), 0);
  const inBox = rows.reduce((s, r) => s + boxed(r), 0);
  const shortCount = rows.filter((r) => boxed(r) < Number(r.quantity_needed)).length;

  function applyAssignment(cardName: string, changes: Map<number, number>) {
    setCards((prev) =>
      prev.map((c) => {
        if (c.card_name !== cardName) return c;
        const locations = c.locations.map((l) =>
          changes.has(l.deck_id) ? { ...l, quantity_assigned: changes.get(l.deck_id)! } : l
        );
        const assigned = locations.reduce((s, l) => s + Number(l.quantity_assigned), 0);
        return { ...c, locations, assigned_total: assigned, unassigned: Number(c.owned) - assigned };
      })
    );
    if (changes.has(deckId)) {
      setDetails((prev) =>
        prev.map((d) => (d.card_name === cardName ? { ...d, quantity_assigned: changes.get(deckId)! } : d))
      );
    }
  }

  function currentFor(card: CardRow, id: number): number {
    return Number(card.locations.find((l) => l.deck_id === id)?.quantity_assigned ?? 0);
  }

  async function addFromBinder(card: CardRow) {
    const before = currentFor(card, deckId);
    setBusy(true);
    applyAssignment(card.card_name, new Map([[deckId, before + 1]]));
    try {
      await setAssignment(card.card_name, deckId, before + 1);
    } catch (err) {
      applyAssignment(card.card_name, new Map([[deckId, before]]));
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function takeFrom(card: CardRow, src: CardLocation) {
    const srcBefore = Number(src.quantity_assigned);
    const before = currentFor(card, deckId);
    setBusy(true);
    applyAssignment(card.card_name, new Map([[src.deck_id, srcBefore - 1], [deckId, before + 1]]));
    try {
      // Decrement the source first so the server never sees more copies assigned than owned.
      await setAssignment(card.card_name, src.deck_id, srcBefore - 1);
      await setAssignment(card.card_name, deckId, before + 1);
    } catch (err) {
      applyAssignment(card.card_name, new Map([[src.deck_id, srcBefore], [deckId, before]]));
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!deck || !confirm(`Stop tracking ${deck.name}? Its assignments will be deleted.`)) return;
    try {
      await deleteDeck(deck.id);
      onRemoved();
    } catch (err) {
      setError(String(err));
    }
  }

  if (!deck) {
    return decksLoading ? (
      <p className="empty-state">Loading…</p>
    ) : (
      <>
        <a href="#/" className="back">← Decks</a>
        <p className="empty-state">This deck isn't tracked.</p>
      </>
    );
  }

  function renderRow(r: Row) {
    const needed = Number(r.quantity_needed);
    const card = cardMap.get(r.card_name);
    const gap = needed - r.inBox;
    const isBasic = BASIC_LANDS.has(r.card_name);
    const free = card ? Number(card.unassigned) : 0;
    const otherDecks =
      card && gap > 0
        ? card.locations.filter((l) => l.deck_id !== deckId && Number(l.quantity_assigned) > 0)
        : [];

    return (
      <div className="list-row" key={`${r.card_name}|${r.board}`}>
        <span className="card-name">{r.card_name}</span>
        {needed > 8 || isBasic ? (
          <span className="slot-count">{isBasic ? needed : `${r.inBox} / ${needed}`}</span>
        ) : (
          <span className="slots" aria-label={`${r.inBox} of ${needed}`}>
            {Array.from({ length: needed }, (_, i) => (
              <span key={i} className={`slot ${i < r.inBox ? 'slot-in' : 'slot-out'}`} />
            ))}
          </span>
        )}
        <div className="sources">
          {!isBasic && card && gap > 0 && free > 0 && (
            <span className="source binder">
              <span>Binder <strong>{free}</strong></span>
              <button className="source-btn" onClick={() => addFromBinder(card)} disabled={busy}>
                + Add 1
              </button>
            </span>
          )}
          {!isBasic && card && otherDecks.map((src) => (
            <span className="source" key={src.deck_id}>
              <span>{src.deck_name} <strong>{src.quantity_assigned}</strong></span>
              <button className="source-btn" onClick={() => takeFrom(card, src)} disabled={busy}>
                Take 1
              </button>
            </span>
          ))}
        </div>
      </div>
    );
  }

  const visible = shortOnly
    ? rows.filter((r) => !BASIC_LANDS.has(r.card_name) && r.inBox < Number(r.quantity_needed))
    : rows;

  const groups: { label: string; rows: Row[] }[] = [];
  const commander = visible.filter((r) => r.board === 'commander');
  if (commander.length) groups.push({ label: 'Commander', rows: commander });
  const main = visible.filter((r) => r.board !== 'commander' && r.board !== 'sideboard');
  for (const t of TYPE_ORDER) {
    const g = main.filter((r) => primaryType(r.card_type) === t);
    if (g.length) groups.push({ label: plural(t), rows: g.sort((a, b) => a.card_name.localeCompare(b.card_name)) });
  }
  const side = visible.filter((r) => r.board === 'sideboard').sort((a, b) => a.card_name.localeCompare(b.card_name));
  if (side.length) groups.push({ label: 'Sideboard', rows: side });

  return (
    <>
      <a href="#/" className="back">← Decks</a>

      <div className="deck-head">
        <div>
          <h1 className="deck-title">{deck.name}</h1>
          <div className="deck-links">
            <a href={`https://www.moxfield.com/decks/${deck.moxfield_public_id}`} target="_blank" rel="noreferrer">
              Moxfield
            </a>
            <button className="btn-quiet" onClick={handleRemove}>Remove</button>
          </div>
        </div>
        {!loading && total > 0 && (
          <span className="big-count">{inBox}<span> / {total}</span></span>
        )}
      </div>

      {error && <p className="warn" role="alert">{error}</p>}

      {loading ? (
        <p className="empty-state">Loading deck…</p>
      ) : rows.length === 0 ? (
        <p className="empty-state">No cards found for this deck. Try syncing.</p>
      ) : (
        <>
          <div className="filters" role="group" aria-label="Filter decklist">
            <button className="btn-outline" aria-pressed={!shortOnly} onClick={() => setShortOnly(false)}>All</button>
            <button className="btn-outline" aria-pressed={shortOnly} onClick={() => setShortOnly(true)}>
              Short · {shortCount}
            </button>
          </div>

          {visible.length === 0 ? (
            <p className="empty-state">Every card is in the box.</p>
          ) : (
            <div className="list">
              <div className="list-inner">
                {groups.map((g) => (
                  <div key={g.label}>
                    <div className="list-group">
                      {g.label}
                      <span className="mono">{g.rows.reduce((s, r) => s + Number(r.quantity_needed), 0)}</span>
                    </div>
                    {g.rows.map(renderRow)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
