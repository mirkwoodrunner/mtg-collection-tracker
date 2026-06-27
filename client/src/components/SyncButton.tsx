import { useState } from 'react';
import { triggerSync } from '../api';

interface Props {
  onSynced: () => void;
}

export default function SyncButton({ onSynced }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await triggerSync();
      setResult(`Synced ${res.decksUpdated} deck(s) and ${res.collectionCardsUpdated} collection cards.`);
      onSynced();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      <button onClick={handleSync} disabled={loading}>
        {loading ? 'Syncing...' : 'Sync All'}
      </button>
      {result && <span style={{ color: 'green', fontSize: '0.85rem' }}>{result}</span>}
      {error && <span style={{ color: 'red', fontSize: '0.85rem' }}>{error}</span>}
    </div>
  );
}
