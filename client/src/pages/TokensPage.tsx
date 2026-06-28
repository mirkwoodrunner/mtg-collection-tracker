import { useEffect, useState, useMemo } from 'react';
import { getTokens } from '../api';
import type { TokenRow } from '../types';

const COLOR_NAMES: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
};

function formatColors(colors: string): string {
  if (!colors) return 'Colorless';
  return colors.split(',').map((c) => COLOR_NAMES[c] ?? c).join(', ');
}

type SortKey = 'card_name' | 'type_line' | 'colors';

export default function TokensPage() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('card_name');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    getTokens()
      .then(setTokens)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  const displayed = useMemo(() => {
    const filtered = tokens.filter(
      (t) => !filter || t.card_name.toLowerCase().includes(filter.toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      const aVal = (a[sortKey] ?? '') as string;
      const bVal = (b[sortKey] ?? '') as string;
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [tokens, filter, sortKey, sortAsc]);

  if (loading) return <p style={{ color: 'var(--text-dim)' }}>Loading tokens…</p>;
  if (error)   return <p style={{ color: 'var(--red)' }}>{error}</p>;

  const arrow = (key: SortKey) => sortKey === key ? (sortAsc ? ' ▲' : ' ▼') : '';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input
          className="mtg-input"
          type="text"
          placeholder="Filter by token name…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: '240px' }}
        />
        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          {displayed.length} token{displayed.length !== 1 ? 's' : ''}
        </span>
      </div>

      {tokens.length === 0 && !filter ? (
        <p style={{ color: 'var(--text-dim)' }}>No tokens found. Sync your decks to load token data.</p>
      ) : displayed.length === 0 ? (
        <p style={{ color: 'var(--text-dim)' }}>No tokens match the filter.</p>
      ) : (
        <div className="mtg-table-wrap" style={{ overflowX: 'auto' }}>
          <table className="mtg-table" style={{ fontSize: '0.88rem' }}>
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('card_name')}>Name{arrow('card_name')}</th>
                <th className="sortable" onClick={() => handleSort('colors')}>Color{arrow('colors')}</th>
                <th className="sortable" onClick={() => handleSort('type_line')}>Type{arrow('type_line')}</th>
                <th>Card Text</th>
                <th style={{ textAlign: 'center' }}>P/T</th>
                <th>Decks</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((token, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500, color: 'var(--text-bright)', whiteSpace: 'nowrap' }}>
                    {token.card_name}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--text-dim)' }}>
                    {formatColors(token.colors)}
                  </td>
                  <td style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                    {token.type_line ?? '—'}
                  </td>
                  <td style={{ color: 'var(--text)', maxWidth: '260px', lineHeight: '1.4' }}>
                    {token.oracle_text ?? ''}
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--text-dim)', whiteSpace: 'nowrap', fontFamily: 'var(--mono)', fontSize: '0.82rem' }}>
                    {token.power != null ? `${token.power}/${token.toughness}` : ''}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {token.deck_names.map((name) => (
                        <span key={name} className="loc-chip loc-chip-default" style={{ fontSize: '0.75rem' }}>
                          {name}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
