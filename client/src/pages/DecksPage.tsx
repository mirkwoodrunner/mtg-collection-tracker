import { useEffect, useMemo, useState } from 'react';
import { getCards } from '../api';
import type { CardRow, Deck } from '../types';
import { BASIC_LANDS } from '../cardUtils';
import AddDeckForm from '../components/AddDeckForm';

interface Props {
  decks: Deck[];
  loading: boolean;
  error: string | null;
  onAdded: (deck: Deck) => void;
}

export default function DecksPage({ decks, loading, error, onAdded }: Props) {
  const [cards, setCards] = useState<CardRow[]>([]);

  useEffect(() => {
    getCards().then(setCards).catch(() => setCards([]));
  }, [decks.length]);

  // Per deck: copies needed vs copies assigned (capped at needed).
  // Basic lands count toward the total and are always treated as in the box.
  const stats = useMemo(() => {
    const m = new Map<number, { inBox: number; total: number }>();
    for (const c of cards) {
      const isBasic = BASIC_LANDS.has(c.card_name);
      for (const loc of c.locations ?? []) {
        const s = m.get(loc.deck_id) ?? { inBox: 0, total: 0 };
        const needed = Number(loc.quantity_needed);
        s.total += needed;
        s.inBox += isBasic ? needed : Math.min(Number(loc.quantity_assigned), needed);
        m.set(loc.deck_id, s);
      }
    }
    return m;
  }, [cards]);

  return (
    <>
      <div className="page-head">
        <h1 className="title">Decks</h1>
        <AddDeckForm onAdded={onAdded} />
      </div>

      {loading && <p className="empty-state">Loading decks…</p>}
      {error && <p className="warn">{error}</p>}
      {!loading && !error && decks.length === 0 && (
        <p className="empty-state">No decks yet. Paste a Moxfield deck URL above.</p>
      )}

      {decks.length > 0 && (
        <section className="deck-grid" aria-label="Tracked decks">
          {decks.map((deck) => {
            const s = stats.get(deck.id);
            const pct = s && s.total > 0 ? (s.inBox / s.total) * 100 : 0;
            const done = !!s && s.total > 0 && s.inBox === s.total;
            return (
              <a key={deck.id} href={`#/deck/${deck.id}`} className="deck-tile">
                <h2 className="deck-name">{deck.name}</h2>
                <div className="bar" aria-hidden="true">
                  <div className={`bar-fill${done ? ' done' : ''}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="count">{s ? `${s.inBox} / ${s.total}` : '—'}</span>
              </a>
            );
          })}
        </section>
      )}
    </>
  );
}
