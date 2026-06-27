import { useState } from 'react';
import { addDeck } from '../api';
import type { Deck } from '../types';

interface Props {
  onAdded: (deck: Deck) => void;
}

export default function AddDeckForm({ onAdded }: Props) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const deck = await addDeck(value.trim());
      onAdded(deck);
      setValue('');
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
      <input
        type="text"
        placeholder="Moxfield deck URL or public ID"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ flex: '1 1 300px', padding: '0.4rem 0.6rem' }}
        disabled={loading}
      />
      <button type="submit" disabled={loading || !value.trim()}>
        {loading ? 'Adding...' : 'Add Deck'}
      </button>
      {error && <span style={{ color: 'red', width: '100%', fontSize: '0.85rem' }}>{error}</span>}
    </form>
  );
}
