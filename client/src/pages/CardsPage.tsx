import { useEffect, useState, useMemo } from 'react';
import { getCards } from '../api';
import type { CardRow } from '../types';
import CardRowComponent from '../components/CardRow';

const BASIC_LANDS = new Set([
  'Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes',
  'Snow-Covered Plains', 'Snow-Covered Island', 'Snow-Covered Swamp',
  'Snow-Covered Mountain', 'Snow-Covered Forest',
]);

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
    if (key === sortKey) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(key === 'card_name'); }
  }

  function handleAssignmentChanged(cardName: string, deckId: number, newQty: number) {
    setCards((prev) =>
      prev.map((c) => {
        if (c.card_name !== cardName) return c;
        const newLocations = c.locations.map((loc) =>
          loc.deck_id === deckId ? { ...loc, quantity_assigned: newQty } : loc
        );
        const assignedTotal = newLocations.reduce((sum, loc) => sum + loc.quantity_assigned, 0);
        return { ...c, locations: newLocations, assigned_total: assignedTotal, unassigned: c.owned - assignedTotal };
      })
    );
  }

  const displayed = useMemo(() => {
    const filtered = cards.filter(
      (c) =>
        !BASIC_LANDS.has(c.card_name) &&
        (!filter || c.card_name.toLowerCase().includes(filter.toLowerCase()))
    );
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey], bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string')
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [cards, filter, sortKey, sortAsc]);

  if (loading) return <p style={{ color: 'var(--text-dim)' }}>Loading cards…</p>;
  if (error)   return <p style={{ color: 'var(--red)' }}>{error}</p>;

  const arrow = (key: SortKey) => sortKey === key ? (sortAsc ? ' ▲' : ' ▼') : '';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input
          className="mtg-input"
          type="text"
          placeholder="Filter by card name…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: '240px' }}
        />
        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          {displayed.length} card{displayed.length !== 1 ? 's' : ''}
        </span>
        {cards.some((c) => c.unassigned < 0) && (
          <span style={{ fontSize: '0.8rem', color: 'var(--red)', fontWeight: 600 }}>
            ⚠ Some cards over-allocated
          </span>
        )}
      </div>

      {displayed.length === 0 ? (
        <p style={{ color: 'var(--text-dim)' }}>
          {filter ? 'No cards match the filter.' : 'No cards found. Add decks and sync to populate.'}
        </p>
      ) : (
        <div className="mtg-table-wrap" style={{ overflowX: 'auto' }}>
          <table className="mtg-table" style={{ fontSize: '0.88rem' }}>
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('card_name')}>Card Name{arrow('card_name')}</th>
                <th className="sortable" onClick={() => handleSort('owned')} style={{ textAlign: 'center' }}>Own{arrow('owned')}</th>
                <th className="sortable" onClick={() => handleSort('total_needed')} style={{ textAlign: 'center' }}>Need{arrow('total_needed')}</th>
                <th className="sortable" onClick={() => handleSort('shortfall')} style={{ textAlign: 'center' }}>Short{arrow('shortfall')}</th>
                <th>Locations</th>
                <th style={{ textAlign: 'center' }}>Free</th>
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
