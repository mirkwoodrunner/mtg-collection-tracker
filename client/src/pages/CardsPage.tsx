import { useEffect, useState, useMemo } from 'react';
import { getCards } from '../api';
import type { CardRow } from '../types';
import CardRowComponent from '../components/CardRow';

type SortKey = 'shortfall' | 'card_name' | 'owned' | 'total_needed';

export default function CardsPage() {
  const [cards, setCards] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('shortfall');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    getCards()
      .then(setCards)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc((a) => !a);
    } else {
      setSortKey(key);
      setSortAsc(key === 'card_name');
    }
  }

  function handleAssignmentChanged(cardName: string, deckId: number, newQty: number) {
    setCards((prev) =>
      prev.map((c) => {
        if (c.card_name !== cardName) return c;
        const newLocations = c.locations.map((loc) =>
          loc.deck_id === deckId ? { ...loc, quantity_assigned: newQty } : loc
        );
        const assignedTotal = newLocations.reduce((sum, loc) => sum + loc.quantity_assigned, 0);
        return {
          ...c,
          locations: newLocations,
          assigned_total: assignedTotal,
          unassigned: c.owned - assignedTotal,
        };
      })
    );
  }

  const displayed = useMemo(() => {
    const filtered = filter
      ? cards.filter((c) => c.card_name.toLowerCase().includes(filter.toLowerCase()))
      : cards;

    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      const diff = (aVal as number) - (bVal as number);
      return sortAsc ? diff : -diff;
    });
  }, [cards, filter, sortKey, sortAsc]);

  if (loading) return <p>Loading cards...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  function th(label: string, key: SortKey) {
    const active = sortKey === key;
    return (
      <th
        onClick={() => handleSort(key)}
        style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
      >
        {label} {active ? (sortAsc ? '▲' : '▼') : ''}
      </th>
    );
  }

  return (
    <div>
      <h2>Cards</h2>
      <div style={{ marginBottom: '0.75rem' }}>
        <input
          type="text"
          placeholder="Filter by card name..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: '0.4rem 0.6rem', width: '280px' }}
        />
        <span style={{ marginLeft: '1rem', fontSize: '0.85rem', color: '#888' }}>
          {displayed.length} card{displayed.length !== 1 ? 's' : ''}
          {cards.some((c) => c.unassigned < 0) && (
            <span style={{ marginLeft: '0.75rem', color: '#c0392b', fontWeight: 600 }}>
              ⚠ Some cards are over-allocated
            </span>
          )}
        </span>
      </div>
      {displayed.length === 0 ? (
        <p style={{ color: '#888' }}>
          {filter ? 'No cards match the filter.' : 'No cards found. Add decks and sync to populate.'}
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f1f2f6', textAlign: 'left' }}>
                {th('Card Name', 'card_name')}
                {th('Owned', 'owned')}
                {th('Total Needed', 'total_needed')}
                {th('Shortfall', 'shortfall')}
                <th style={{ padding: '0.5rem 0.75rem' }}>Locations (assigned/needed)</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>Unassigned</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((card) => (
                <CardRowComponent
                  key={card.card_name}
                  card={card}
                  onAssignmentChanged={handleAssignmentChanged}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
