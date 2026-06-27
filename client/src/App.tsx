import { useState } from 'react';
import DecksPage from './pages/DecksPage';
import CardsPage from './pages/CardsPage';
import './App.css';

type Tab = 'decks' | 'cards';

function App() {
  const [tab, setTab] = useState<Tab>('decks');

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>MTG Collection Tracker</h1>
      <p style={{ color: '#636e72', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
        Track which physical copies of your cards are allocated to which Moxfield decks.
      </p>
      <nav style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #dfe6e9' }}>
        {(['decks', 'cards'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '0.5rem 1.25rem',
              border: 'none',
              borderBottom: tab === t ? '2px solid #2d3436' : '2px solid transparent',
              marginBottom: '-2px',
              background: 'none',
              cursor: 'pointer',
              fontWeight: tab === t ? 600 : 400,
              fontSize: '1rem',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </nav>
      {tab === 'decks' ? <DecksPage /> : <CardsPage />}
    </div>
  );
}

export default App;
