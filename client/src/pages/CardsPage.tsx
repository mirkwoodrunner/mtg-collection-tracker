import { useEffect, useState, useMemo } from 'react';
import { getCards } from '../api';
import type { CardRow } from '../types';
import CardRowComponent from '../components/CardRow';
import { BASIC_LANDS } from '../cardUtils';


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
        const assignedTotal = newLocations.reduce((sum, loc) => sum + Number(loc.quantity_assigned), 0);
        return { ...c, locations: newLocations, assigned_total: assignedTotal, unassigned: Number(c.owned) - assignedTotal };
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
      if (sortKey === 'card_name')
        return sortAsc ? a.card_name.localeCompare(b.card_name) : b.card_name.localeCompare(a.card_name);
      const diff = Number(a[sortKey]) - Number(b[sortKey]);
      return sortAsc ? diff : -diff;
    });
  }, [cards, filter, sortKey, sortAsc]);

  if (loading) return <p className="empty-state">Loading cards…</p>;
  if (error)   return <p className="warn">{error}</p>;

  const arrow = (key: SortKey) => sortKey === key ? (sortAsc ? ' ▲' : ' ▼') : '';

  return (
    <>
      <div className="page-head">
        <h1 className="title">Cards</h1>
      </div>

      <div className="toolbar">
        <input
          className="input"
          type="search"
          aria-label="Filter by card name"
          placeholder="Card name"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select
          className="input sort-select"
          aria-label="Sort cards"
          value={sortKey}
          onChange={(e) => { const k = e.target.value as SortKey; setSortKey(k); setSortAsc(k === 'card_name'); }}
        >
          <option value="shortfall">Sort: Most short</option>
          <option value="card_name">Sort: Name</option>
          <option value="owned">Sort: Most owned</option>
          <option value="total_needed">Sort: Most needed</option>
        </select>
        <span className="dim mono toolbar-count">{displayed.length}</span>
        {cards.some((c) => Number(c.unassigned) < 0) && (
          <span className="warn" style={{ fontSize: 13 }}>Some cards have more copies assigned than owned</span>
        )}
      </div>

      {displayed.length === 0 ? (
        <p className="empty-state">
          {filter ? 'No cards match.' : 'No cards yet. Add decks and sync.'}
        </p>
      ) : (
        <div className="table-wrap">
          <table className="tbl tbl-stack">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('card_name')}>Card{arrow('card_name')}</th>
                <th className="sortable num" onClick={() => handleSort('owned')}>Own{arrow('owned')}</th>
                <th className="sortable num" onClick={() => handleSort('total_needed')}>Need{arrow('total_needed')}</th>
                <th className="sortable num" onClick={() => handleSort('shortfall')}>Short{arrow('shortfall')}</th>
                <th>Decks</th>
                <th className="num">Free</th>
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
    </>
  );
}
