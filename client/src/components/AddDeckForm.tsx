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
    <form className="add-form" onSubmit={handleSubmit}>
      <input
        className="input"
        type="text"
        aria-label="Moxfield deck URL or public ID"
        placeholder="Moxfield deck URL"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={loading}
      />
      <button className="btn" type="submit" disabled={loading || !value.trim()}>
        {loading ? 'Adding…' : 'Add'}
      </button>
      {error && <span className="form-error" role="alert">{error}</span>}
    </form>
  );
}
