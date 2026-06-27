import { useEffect, useState, useMemo } from 'react';
import { getDecks, getCards, setAssignment } from '../api';
import type { Deck, CardRow, CardLocation } from '../types';

export default function DeckViewPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transferring, setTransferring] = useState<string | null>(null); // "cardName|sourceDeckId"

  useEffect(() => {
    Promise.all([getDecks(), getCards()])
      .then(([d, c]) => {
        setDecks(d);
        setCards(c);
        if (d.length > 0) setSelectedDeckId(d[0].id);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const deckCards = useMemo(() => {
    if (selectedDeckId === null) return [];
    return cards.filter((c) => c.locations.some((l) => l.deck_id === selectedDeckId));
  }, [cards, selectedDeckId]);

  const fullyAssigned = useMemo(
    () =>
      deckCards.filter((c) => {
        const loc = c.locations.find((l) => l.deck_id === selectedDeckId);
        return loc && loc.quantity_assigned >= loc.quantity_needed;
      }).length,
    [deckCards, selectedDeckId]
  );

  async function handleTransfer(card: CardRow, sourceLoc: CardLocation) {
    if (selectedDeckId === null) return;
    const key = `${card.card_name}|${sourceLoc.deck_id}`;
    setTransferring(key);

    const targetLoc = card.locations.find((l) => l.deck_id === selectedDeckId)!;
    const newSourceQty = sourceLoc.quantity_assigned - 1;
    const newTargetQty = targetLoc.quantity_assigned + 1;

    // optimistic update
    setCards((prev) =>
      prev.map((c) => {
        if (c.card_name !== card.card_name) return c;
        return {
          ...c,
          locations: c.locations.map((l) => {
            if (l.deck_id === sourceLoc.deck_id) return { ...l, quantity_assigned: newSourceQty };
            if (l.deck_id === selectedDeckId) return { ...l, quantity_assigned: newTargetQty };
            return l;
          }),
        };
      })
    );

    try {
      await setAssignment(card.card_name, sourceLoc.deck_id, newSourceQty);
      await setAssignment(card.card_name, selectedDeckId, newTargetQty);
    } catch {
      // rollback
      setCards((prev) =>
        prev.map((c) => {
          if (c.card_name !== card.card_name) return c;
          return {
            ...c,
            locations: c.locations.map((l) => {
              if (l.deck_id === sourceLoc.deck_id) return { ...l, quantity_assigned: sourceLoc.quantity_assigned };
              if (l.deck_id === selectedDeckId) return { ...l, quantity_assigned: targetLoc.quantity_assigned };
              return l;
            }),
          };
        })
      );
    } finally {
      setTransferring(null);
    }
  }

  if (loading) return <p style={{ color: 'var(--text-dim)' }}>Loading…</p>;
  if (error) return <p style={{ color: 'var(--red)' }}>{error}</p>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select
          className="mtg-input"
          value={selectedDeckId ?? ''}
          onChange={(e) => setSelectedDeckId(Number(e.target.value))}
          style={{ minWidth: '220px' }}
        >
          {decks.length === 0 && <option value="">No decks tracked</option>}
          {decks.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {selectedDeckId !== null && deckCards.length > 0 && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            <span style={{ color: fullyAssigned === deckCards.length ? 'var(--green)' : 'var(--text-dim)' }}>
              {fullyAssigned}
            </span>
            {' '}of {deckCards.length} cards fully assigned
          </span>
        )}
      </div>

      {selectedDeckId !== null && deckCards.length === 0 && (
        <p style={{ color: 'var(--text-dim)' }}>No cards found for this deck. Try syncing first.</p>
      )}

      {deckCards.length > 0 && (
        <div className="mtg-table-wrap" style={{ overflowX: 'auto' }}>
          <table className="mtg-table" style={{ fontSize: '0.88rem' }}>
            <thead>
              <tr>
                <th>Card Name</th>
                <th style={{ textAlign: 'center' }}>Need</th>
                <th style={{ textAlign: 'center' }}>Assigned</th>
                <th style={{ textAlign: 'center' }}>Gap</th>
                <th>Available in Other Decks</th>
              </tr>
            </thead>
            <tbody>
              {deckCards.map((card) => {
                const thisLoc = card.locations.find((l) => l.deck_id === selectedDeckId)!;
                const gap = thisLoc.quantity_needed - thisLoc.quantity_assigned;
                const assignedClass =
                  thisLoc.quantity_assigned >= thisLoc.quantity_needed
                    ? 'text-green'
                    : thisLoc.quantity_assigned === 0
                    ? 'text-red'
                    : 'text-orange';

                const sources = card.locations.filter(
                  (l) => l.deck_id !== selectedDeckId && l.quantity_assigned > 0
                );

                return (
                  <tr key={card.card_name}>
                    <td style={{ fontWeight: 500, color: 'var(--text-bright)' }}>{card.card_name}</td>
                    <td style={{ textAlign: 'center' }}>{thisLoc.quantity_needed}</td>
                    <td className={assignedClass} style={{ textAlign: 'center' }}>
                      {thisLoc.quantity_assigned}
                    </td>
                    <td style={{ textAlign: 'center', color: gap > 0 ? 'var(--red)' : 'var(--text-dim)' }}>
                      {gap > 0 ? `−${gap}` : '—'}
                    </td>
                    <td>
                      {sources.length === 0 ? (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {sources.map((src) => {
                            const key = `${card.card_name}|${src.deck_id}`;
                            const busy = transferring === key;
                            return (
                              <span
                                key={src.deck_id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '3px 8px 3px 10px',
                                  background: 'rgba(22, 25, 37, 0.9)',
                                  border: '1px solid var(--border-sub)',
                                  borderRadius: '5px',
                                  fontSize: '0.72rem',
                                  color: 'var(--text)',
                                }}
                              >
                                <span style={{ color: 'var(--text-dim)' }}>{src.deck_name}:</span>
                                <span style={{ fontWeight: 600 }}>{src.quantity_assigned}</span>
                                <button
                                  onClick={() => handleTransfer(card, src)}
                                  disabled={busy || !!transferring}
                                  style={{
                                    padding: '1px 6px',
                                    background: 'transparent',
                                    border: '1px solid var(--gold)',
                                    borderRadius: '3px',
                                    color: 'var(--gold)',
                                    fontSize: '0.68rem',
                                    cursor: busy || !!transferring ? 'not-allowed' : 'pointer',
                                    opacity: busy || !!transferring ? 0.5 : 1,
                                    whiteSpace: 'nowrap',
                                    fontFamily: 'var(--sans)',
                                  }}
                                >
                                  {busy ? '…' : '← Transfer 1'}
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
