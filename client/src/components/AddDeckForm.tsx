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
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}
    >
      <input
        className="mtg-input"
        type="text"
        placeholder="Moxfield deck URL or public ID"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ flex: '1 1 280px' }}
        disabled={loading}
      />
      <button className="btn-primary" type="submit" disabled={loading || !value.trim()}>
        {loading ? 'Adding…' : '+ Add Deck'}
      </button>
      {error && (
        <span style={{ color: 'var(--red)', width: '100%', fontSize: '0.82rem' }}>{error}</span>
      )}
    </form>
  );
}
