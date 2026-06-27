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

  if (loading) return <p>Loading decks...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h2>Tracked Decks</h2>
      <AddDeckForm onAdded={(deck) => setDecks((prev) => [...prev, deck])} />
      <SyncButton onSynced={loadDecks} />

      {decks.length === 0 ? (
        <p style={{ marginTop: '1rem', color: '#888' }}>No decks tracked yet. Add one above.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ background: '#f1f2f6', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem 0.75rem' }}>Name</th>
              <th style={{ padding: '0.5rem 0.75rem' }}>Moxfield ID</th>
              <th style={{ padding: '0.5rem 0.75rem' }}>Last Synced</th>
              <th style={{ padding: '0.5rem 0.75rem' }}></th>
            </tr>
          </thead>
          <tbody>
            {decks.map((deck) => (
              <tr key={deck.id} style={{ borderBottom: '1px solid #dfe6e9' }}>
                <td style={{ padding: '0.5rem 0.75rem' }}>
                  <a
                    href={`https://www.moxfield.com/decks/${deck.moxfield_public_id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {deck.name}
                  </a>
                </td>
                <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {deck.moxfield_public_id}
                </td>
                <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: '#636e72' }}>
                  {deck.last_synced_at
                    ? new Date(deck.last_synced_at).toLocaleString()
                    : 'Never'}
                </td>
                <td style={{ padding: '0.5rem 0.75rem' }}>
                  <button
                    onClick={() => handleDelete(deck.id)}
                    style={{ color: 'red', background: 'none', border: '1px solid red', cursor: 'pointer', borderRadius: '3px', padding: '0.2rem 0.5rem' }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
