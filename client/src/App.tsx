import { useState } from 'react';
import DecksPage from './pages/DecksPage';
import CardsPage from './pages/CardsPage';
import DeckViewPage from './pages/DeckViewPage';
import TokensPage from './pages/TokensPage';
import './App.css';

type Tab = 'decks' | 'cards' | 'deck' | 'tokens';

const tabBase: React.CSSProperties = {
  padding: '0.55rem 1.3rem',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontFamily: 'var(--sans)',
  fontSize: '0.88rem',
  letterSpacing: '0.03em',
  transition: 'color 0.15s',
  marginBottom: '-1px',
};

function App() {
  const [tab, setTab] = useState<Tab>('decks');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--sans)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.25rem 2rem 0' }}>
        <header style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.55rem', marginBottom: '0.25rem' }}>
            <span style={{ color: 'var(--gold)', fontSize: '0.95rem', lineHeight: '1', flexShrink: 0 }}>✦</span>
            <h1
              style={{
                fontFamily: 'var(--display)',
                fontSize: '1.15rem',
                fontWeight: 600,
                color: 'var(--text-bright)',
                letterSpacing: '0.12em',
                margin: 0,
                textTransform: 'uppercase',
              }}
            >
              MTG Collection Tracker
            </h1>
          </div>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', margin: '0 0 0 1.6rem', letterSpacing: '0.02em' }}>
            Track which physical copies of your cards are allocated to which Moxfield decks.
          </p>
        </header>

        <nav style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }}>
          {(['decks', 'cards', 'deck', 'tokens'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                ...tabBase,
                color: tab === t ? 'var(--gold)' : 'var(--text-dim)',
                borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
                fontWeight: tab === t ? 500 : 400,
              }}
            >
              {t === 'deck' ? 'Deck View' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem 4rem' }}>
        <div className="page-fade" key={tab}>
          {tab === 'decks' ? <DecksPage /> : tab === 'cards' ? <CardsPage /> : tab === 'tokens' ? <TokensPage /> : <DeckViewPage />}
        </div>
      </div>
    </div>
  );
}

export default App;
