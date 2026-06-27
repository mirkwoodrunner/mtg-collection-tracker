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
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
      <button className="btn-secondary" onClick={handleSync} disabled={loading}>
        <span style={{ fontSize: '0.9rem' }}>↻</span>
        {loading ? 'Syncing…' : 'Sync All'}
      </button>
      {result && <span style={{ color: 'var(--green)', fontSize: '0.8rem' }}>{result}</span>}
      {error  && <span style={{ color: 'var(--red)',   fontSize: '0.8rem' }}>{error}</span>}
    </div>
  );
}
