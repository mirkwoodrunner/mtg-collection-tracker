import { useEffect, useState } from 'react';
import { getDecks, deleteDeck } from '../api';
import type { Deck } from '../types';
import AddDeckForm from '../components/AddDeckForm';
import SyncButton from '../components/SyncButton';

export default function DecksPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDecks() {
    try {
      setDecks(await getDecks());
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDecks(); }, []);

  async function handleDelete(id: number) {
    if (!confirm('Remove this deck from tracking?')) return;
    try {
      await deleteDeck(id);
      setDecks((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      alert(String(err));
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <span className="section-label">{decks.length} Tracked Decks</span>
      </div>

      <AddDeckForm onAdded={(deck) => setDecks((prev) => [...prev, deck])} />
      <SyncButton onSynced={loadDecks} />

      {loading && <p style={{ marginTop: '1.5rem', color: 'var(--text-dim)' }}>Loading decks…</p>}
      {error   && <p style={{ marginTop: '1.5rem', color: 'var(--red)' }}>{error}</p>}

      {!loading && !error && decks.length === 0 && (
        <p style={{ marginTop: '1.5rem', color: 'var(--text-dim)' }}>No decks tracked yet. Add one above.</p>
      )}

      {!loading && !error && decks.length > 0 && (
        <div className="mtg-table-wrap">
          <table className="mtg-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Moxfield ID</th>
                <th>Last Synced</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {decks.map((deck) => (
                <tr key={deck.id}>
                  <td>
                    <a
                      href={`https://www.moxfield.com/decks/${deck.moxfield_public_id}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontWeight: 500, fontSize: '0.9rem' }}
                    >
                      {deck.name}
                    </a>
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '0.73rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                    {deck.moxfield_public_id}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                    {deck.last_synced_at
                      ? new Date(deck.last_synced_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Never'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-danger" onClick={() => handleDelete(deck.id)}>
                      Remove
                    </button>
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
