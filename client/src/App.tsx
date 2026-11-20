import { useCallback, useEffect, useState } from 'react';
import { getDecks, triggerSync } from './api';
import type { Deck } from './types';
import { timeAgo } from './cardUtils';
import DecksPage from './pages/DecksPage';
import CardsPage from './pages/CardsPage';
import DeckViewPage from './pages/DeckViewPage';
import TokensPage from './pages/TokensPage';

type Route =
  | { view: 'decks' }
  | { view: 'deck'; deckId: number }
  | { view: 'cards' }
  | { view: 'tokens' };

function parseHash(hash: string): Route {
  const deck = hash.match(/^#\/deck\/(\d+)/);
  if (deck) return { view: 'deck', deckId: Number(deck[1]) };
  if (hash.startsWith('#/cards')) return { view: 'cards' };
  if (hash.startsWith('#/tokens')) return { view: 'tokens' };
  return { view: 'decks' };
}

type Theme = 'light' | 'dark';

function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  const [decks, setDecks] = useState<Deck[]>([]);
  const [decksLoading, setDecksLoading] = useState(true);
  const [decksError, setDecksError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [theme, setTheme] = useState<Theme>(
    () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
  );

  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const loadDecks = useCallback(async () => {
    try {
      setDecks(await getDecks());
      setDecksError(null);
    } catch (err) {
      setDecksError(String(err));
    } finally {
      setDecksLoading(false);
    }
  }, []);

  useEffect(() => { loadDecks(); }, [loadDecks]);

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch { /* storage unavailable */ }
    setTheme(next);
  }

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      await triggerSync();
      await loadDecks();
      setVersion((v) => v + 1);
    } catch (err) {
      setSyncError(String(err));
    } finally {
      setSyncing(false);
    }
  }

  const lastSynced = decks.reduce<string | null>(
    (latest, d) => (d.last_synced_at && (!latest || d.last_synced_at > latest) ? d.last_synced_at : latest),
    null
  );

  const navView = route.view === 'deck' ? 'decks' : route.view;

  let page: React.ReactNode;
  if (route.view === 'cards') page = <CardsPage />;
  else if (route.view === 'tokens') page = <TokensPage />;
  else if (route.view === 'deck')
    page = (
      <DeckViewPage
        deckId={route.deckId}
        decks={decks}
        decksLoading={decksLoading}
        onRemoved={async () => {
          await loadDecks();
          window.location.hash = '#/';
        }}
      />
    );
  else
    page = (
      <DecksPage
        decks={decks}
        loading={decksLoading}
        error={decksError}
        onAdded={(deck) => setDecks((prev) => [...prev, deck].sort((a, b) => a.name.localeCompare(b.name)))}
      />
    );

  return (
    <>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <a href="#/" className="wordmark">Deckbox</a>
          <nav className="nav" aria-label="Views">
            <a href="#/" aria-current={navView === 'decks' ? 'page' : undefined}>Decks</a>
            <a href="#/cards" aria-current={navView === 'cards' ? 'page' : undefined}>Cards</a>
            <a href="#/tokens" aria-current={navView === 'tokens' ? 'page' : undefined}>Tokens</a>
          </nav>
          <div className="topbar-actions">
            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
              )}
            </button>
            <span className="synced">{syncing ? 'syncing…' : timeAgo(lastSynced)}</span>
            <button className="btn-sync" onClick={handleSync} disabled={syncing}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></svg>
              Sync
            </button>
          </div>
          {syncError && <p className="sync-error" role="alert">Sync failed. {syncError}</p>}
        </div>
      </header>

      <main className="wrap page page-fade" key={`${route.view}-${version}-${route.view === 'deck' ? route.deckId : ''}`}>
        {page}
      </main>
    </>
  );
}

export default App;
