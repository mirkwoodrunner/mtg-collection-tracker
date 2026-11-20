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

  if (loading) return <p className="empty-state">Loading tokens…</p>;
  if (error)   return <p className="warn">{error}</p>;

  const arrow = (key: SortKey) => sortKey === key ? (sortAsc ? ' ▲' : ' ▼') : '';

  return (
    <>
      <div className="page-head">
        <h1 className="title">Tokens</h1>
      </div>

      <div className="toolbar">
        <input
          className="input"
          type="search"
          aria-label="Filter by token name"
          placeholder="Token name"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <span className="dim mono" style={{ fontSize: 13 }}>{displayed.length}</span>
      </div>

      {tokens.length === 0 && !filter ? (
        <p className="empty-state">No tokens yet. Sync to load token data.</p>
      ) : displayed.length === 0 ? (
        <p className="empty-state">No tokens match.</p>
      ) : (
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('card_name')}>Name{arrow('card_name')}</th>
                <th className="sortable" onClick={() => handleSort('colors')}>Color{arrow('colors')}</th>
                <th className="sortable" onClick={() => handleSort('type_line')}>Type{arrow('type_line')}</th>
                <th>Text</th>
                <th className="num">P/T</th>
                <th>Decks</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((token, i) => (
                <tr key={i}>
                  <td className="card-name" style={{ whiteSpace: 'nowrap' }}>{token.card_name}</td>
                  <td className="dim" style={{ whiteSpace: 'nowrap' }}>{formatColors(token.colors)}</td>
                  <td className="dim" style={{ whiteSpace: 'nowrap' }}>{token.type_line ?? '—'}</td>
                  <td style={{ maxWidth: 300 }}>{token.oracle_text ?? ''}</td>
                  <td className="num">{token.power != null ? `${token.power}/${token.toughness}` : ''}</td>
                  <td>
                    <div className="chips">
                      {token.deck_names.map((name) => (
                        <span key={name} className="chip">{name}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
