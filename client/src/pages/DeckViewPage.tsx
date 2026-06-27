import { useEffect, useState, useMemo } from 'react';
import { getDecks, getCards, getDeckCards, setAssignment } from '../api';
import type { Deck, CardRow, CardLocation, DeckCardDetail } from '../types';

const TYPE_ORDER = [
  'Creature',
  'Planeswalker',
  'Battle',
  'Instant',
  'Sorcery',
  'Enchantment',
  'Artifact',
  'Land',
  'Other',
];

function primaryType(cardType: string | null): string {
  if (!cardType) return 'Other';
  const upper = cardType.split('—')[0].trim();
  for (const t of TYPE_ORDER) {
    if (upper.includes(t)) return t;
  }
  return 'Other';
}

export default function DeckViewPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [deckCardDetails, setDeckCardDetails] = useState<DeckCardDetail[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transferring, setTransferring] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getDecks(), getCards()])
      .then(([d, c]) => {
        setDecks(d);
        setCards(c);
        if (d.length > 0) setSelectedDeckId(d[0].id);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedDeckId === null) return;
    setDetailsLoading(true);
    getDeckCards(selectedDeckId)
      .then(setDeckCardDetails)
      .catch((err) => setError(String(err)))
      .finally(() => setDetailsLoading(false));
  }, [selectedDeckId]);

  // Map from card_name to CardRow (for transfer source info)
  const cardMap = useMemo(() => {
    const m = new Map<string, CardRow>();
    for (const c of cards) m.set(c.card_name, c);
    return m;
  }, [cards]);

  // Group deck card details by board then by primary type
  const grouped = useMemo(() => {
    const mainboard: DeckCardDetail[] = [];
    const sideboard: DeckCardDetail[] = [];
    const commander: DeckCardDetail[] = [];

    for (const d of deckCardDetails) {
      if (d.board === 'commander') commander.push(d);
      else if (d.board === 'sideboard') sideboard.push(d);
      else mainboard.push(d);
    }

    function groupByType(cards: DeckCardDetail[]): Map<string, DeckCardDetail[]> {
      const groups = new Map<string, DeckCardDetail[]>();
      for (const c of cards) {
        const type = primaryType(c.card_type);
        if (!groups.has(type)) groups.set(type, []);
        groups.get(type)!.push(c);
      }
      // Sort each group by card name
      for (const [, arr] of groups) arr.sort((a, b) => a.card_name.localeCompare(b.card_name));
      return groups;
    }

    return {
      commander,
      mainboard: groupByType(mainboard),
      sideboard,
    };
  }, [deckCardDetails]);

  const fullyAssigned = useMemo(
    () => deckCardDetails.filter((d) => d.quantity_assigned >= d.quantity_needed).length,
    [deckCardDetails]
  );

  async function handleAssignUnassigned(card: CardRow, detail: DeckCardDetail) {
    if (selectedDeckId === null) return;
    const key = `${card.card_name}|unassigned`;
    setTransferring(key);

    const targetLoc = card.locations.find((l) => l.deck_id === selectedDeckId)!;
    const newTargetQty = detail.quantity_assigned + 1;

    setCards((prev) =>
      prev.map((c) => {
        if (c.card_name !== card.card_name) return c;
        return {
          ...c,
          assigned_total: c.assigned_total + 1,
          unassigned: c.unassigned - 1,
          locations: c.locations.map((l) =>
            l.deck_id === selectedDeckId ? { ...l, quantity_assigned: newTargetQty } : l
          ),
        };
      })
    );
    setDeckCardDetails((prev) =>
      prev.map((d) =>
        d.card_name === card.card_name && d.board === detail.board
          ? { ...d, quantity_assigned: newTargetQty }
          : d
      )
    );

    try {
      await setAssignment(card.card_name, selectedDeckId, newTargetQty);
    } catch {
      setCards((prev) =>
        prev.map((c) => {
          if (c.card_name !== card.card_name) return c;
          return {
            ...c,
            assigned_total: c.assigned_total - 1,
            unassigned: c.unassigned + 1,
            locations: c.locations.map((l) =>
              l.deck_id === selectedDeckId ? { ...l, quantity_assigned: targetLoc.quantity_assigned } : l
            ),
          };
        })
      );
      setDeckCardDetails((prev) =>
        prev.map((d) =>
          d.card_name === card.card_name && d.board === detail.board
            ? { ...d, quantity_assigned: detail.quantity_assigned }
            : d
        )
      );
    } finally {
      setTransferring(null);
    }
  }

  async function handleTransfer(card: CardRow, sourceLoc: CardLocation) {
    if (selectedDeckId === null) return;
    const key = `${card.card_name}|${sourceLoc.deck_id}`;
    setTransferring(key);

    const targetLoc = card.locations.find((l) => l.deck_id === selectedDeckId)!;
    const newSourceQty = sourceLoc.quantity_assigned - 1;
    const newTargetQty = targetLoc.quantity_assigned + 1;

    setCards((prev) =>
      prev.map((c) => {
        if (c.card_name !== card.card_name) return c;
        return {
          ...c,
          locations: c.locations.map((l) => {
            if (l.deck_id === sourceLoc.deck_id) return { ...l, quantity_assigned: newSourceQty };
            if (l.deck_id === selectedDeckId) return { ...l, quantity_assigned: newTargetQty };
            return l;
          }),
        };
      })
    );
    setDeckCardDetails((prev) =>
      prev.map((d) =>
        d.card_name === card.card_name
          ? { ...d, quantity_assigned: newTargetQty }
          : d
      )
    );

    try {
      await setAssignment(card.card_name, sourceLoc.deck_id, newSourceQty);
      await setAssignment(card.card_name, selectedDeckId, newTargetQty);
    } catch {
      // rollback
      setCards((prev) =>
        prev.map((c) => {
          if (c.card_name !== card.card_name) return c;
          return {
            ...c,
            locations: c.locations.map((l) => {
              if (l.deck_id === sourceLoc.deck_id) return { ...l, quantity_assigned: sourceLoc.quantity_assigned };
              if (l.deck_id === selectedDeckId) return { ...l, quantity_assigned: targetLoc.quantity_assigned };
              return l;
            }),
          };
        })
      );
      setDeckCardDetails((prev) =>
        prev.map((d) =>
          d.card_name === card.card_name
            ? { ...d, quantity_assigned: targetLoc.quantity_assigned }
            : d
        )
      );
    } finally {
      setTransferring(null);
    }
  }

  if (loading) return <p style={{ color: 'var(--text-dim)' }}>Loading…</p>;
  if (error) return <p style={{ color: 'var(--red)' }}>{error}</p>;

  function renderCardRows(entries: DeckCardDetail[]) {
    return entries.map((detail) => {
      const card = cardMap.get(detail.card_name);
      const gap = detail.quantity_needed - detail.quantity_assigned;
      const assignedClass =
        detail.quantity_assigned >= detail.quantity_needed
          ? 'text-green'
          : detail.quantity_assigned === 0
          ? 'text-red'
          : 'text-orange';

      const unassigned = card ? card.unassigned : 0;
      const deckSources = card && gap > 0
        ? card.locations.filter((l) => l.deck_id !== selectedDeckId && l.quantity_assigned > 0)
        : [];
      const showUnassigned = gap > 0 && unassigned > 0;
      const unassignedKey = `${detail.card_name}|unassigned`;
      const unassignedBusy = transferring === unassignedKey;

      return (
        <tr key={`${detail.card_name}|${detail.board}`}>
          <td style={{ fontWeight: 500, color: 'var(--text-bright)' }}>{detail.card_name}</td>
          <td style={{ textAlign: 'center' }}>{detail.quantity_needed}</td>
          <td className={assignedClass} style={{ textAlign: 'center' }}>
            {detail.quantity_assigned}
          </td>
          <td style={{ textAlign: 'center', color: gap > 0 ? 'var(--red)' : 'var(--text-dim)' }}>
            {gap > 0 ? `−${gap}` : '—'}
          </td>
          <td>
            {gap <= 0 || (!showUnassigned && deckSources.length === 0) ? (
              <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>—</span>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {showUnassigned && card && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 8px 3px 10px',
                      background: 'rgba(22, 25, 37, 0.9)',
                      border: '1px solid var(--green)',
                      borderRadius: '5px',
                      fontSize: '0.72rem',
                      color: 'var(--text)',
                    }}
                  >
                    <span style={{ color: 'var(--text-dim)' }}>Unassigned:</span>
                    <span style={{ fontWeight: 600, color: 'var(--green)' }}>{unassigned}</span>
                    <button
                      onClick={() => handleAssignUnassigned(card, detail)}
                      disabled={unassignedBusy || !!transferring}
                      style={{
                        padding: '1px 6px',
                        background: 'transparent',
                        border: '1px solid var(--green)',
                        borderRadius: '3px',
                        color: 'var(--green)',
                        fontSize: '0.68rem',
                        cursor: unassignedBusy || !!transferring ? 'not-allowed' : 'pointer',
                        opacity: unassignedBusy || !!transferring ? 0.5 : 1,
                        whiteSpace: 'nowrap',
                        fontFamily: 'var(--sans)',
                      }}
                    >
                      {unassignedBusy ? '…' : '+ Assign 1'}
                    </button>
                  </span>
                )}
                {deckSources.map((src) => {
                  if (!card) return null;
                  const tKey = `${card.card_name}|${src.deck_id}`;
                  const busy = transferring === tKey;
                  return (
                    <span
                      key={src.deck_id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 8px 3px 10px',
                        background: 'rgba(22, 25, 37, 0.9)',
                        border: '1px solid var(--border-sub)',
                        borderRadius: '5px',
                        fontSize: '0.72rem',
                        color: 'var(--text)',
                      }}
                    >
                      <span style={{ color: 'var(--text-dim)' }}>{src.deck_name}:</span>
                      <span style={{ fontWeight: 600 }}>{src.quantity_assigned}</span>
                      <button
                        onClick={() => handleTransfer(card, src)}
                        disabled={busy || !!transferring}
                        style={{
                          padding: '1px 6px',
                          background: 'transparent',
                          border: '1px solid var(--gold)',
                          borderRadius: '3px',
                          color: 'var(--gold)',
                          fontSize: '0.68rem',
                          cursor: busy || !!transferring ? 'not-allowed' : 'pointer',
                          opacity: busy || !!transferring ? 0.5 : 1,
                          whiteSpace: 'nowrap',
                          fontFamily: 'var(--sans)',
                        }}
                      >
                        {busy ? '…' : '← Transfer 1'}
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </td>
        </tr>
      );
    });
  }

  function renderSection(label: string, entries: DeckCardDetail[], showTypeGroups = false) {
    if (entries.length === 0) return null;
    if (!showTypeGroups) {
      return (
        <>
          <tr>
            <td
              colSpan={5}
              style={{
                paddingTop: '1.1rem',
                paddingBottom: '0.35rem',
                fontWeight: 700,
                fontSize: '0.78rem',
                letterSpacing: '0.06em',
                color: 'var(--gold)',
                textTransform: 'uppercase',
              }}
            >
              {label} ({entries.reduce((sum, c) => sum + c.quantity_needed, 0)})
            </td>
          </tr>
          {renderCardRows(entries)}
        </>
      );
    }

    // Group by type for mainboard
    const typeMap = new Map<string, DeckCardDetail[]>();
    for (const c of entries) {
      const type = primaryType(c.card_type);
      if (!typeMap.has(type)) typeMap.set(type, []);
      typeMap.get(type)!.push(c);
    }
    for (const [, arr] of typeMap) arr.sort((a, b) => a.card_name.localeCompare(b.card_name));

    const rows: React.ReactNode[] = [];
    rows.push(
      <tr key={`section-${label}`}>
        <td
          colSpan={5}
          style={{
            paddingTop: '1.1rem',
            paddingBottom: '0.35rem',
            fontWeight: 700,
            fontSize: '0.78rem',
            letterSpacing: '0.06em',
            color: 'var(--gold)',
            textTransform: 'uppercase',
          }}
        >
          {label} ({entries.reduce((sum, c) => sum + c.quantity_needed, 0)})
        </td>
      </tr>
    );

    for (const type of TYPE_ORDER) {
      const group = typeMap.get(type);
      if (!group || group.length === 0) continue;
      rows.push(
        <tr key={`type-${type}`}>
          <td
            colSpan={5}
            style={{
              paddingTop: '0.6rem',
              paddingBottom: '0.2rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-dim)',
              fontStyle: 'italic',
            }}
          >
            {type}s ({group.reduce((sum, c) => sum + c.quantity_needed, 0)})
          </td>
        </tr>
      );
      rows.push(...renderCardRows(group));
    }
    return rows;
  }

  const totalCards = deckCardDetails.length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select
          className="mtg-input"
          value={selectedDeckId ?? ''}
          onChange={(e) => setSelectedDeckId(Number(e.target.value))}
          style={{ minWidth: '220px' }}
        >
          {decks.length === 0 && <option value="">No decks tracked</option>}
          {decks.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {selectedDeckId !== null && totalCards > 0 && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            <span style={{ color: fullyAssigned === totalCards ? 'var(--green)' : 'var(--text-dim)' }}>
              {fullyAssigned}
            </span>
            {' '}of {totalCards} cards fully assigned
          </span>
        )}
      </div>

      {selectedDeckId !== null && !detailsLoading && totalCards === 0 && (
        <p style={{ color: 'var(--text-dim)' }}>No cards found for this deck. Try syncing first.</p>
      )}
      {detailsLoading && <p style={{ color: 'var(--text-dim)' }}>Loading deck…</p>}

      {!detailsLoading && totalCards > 0 && (
        <div className="mtg-table-wrap" style={{ overflowX: 'auto' }}>
          <table className="mtg-table" style={{ fontSize: '0.88rem' }}>
            <thead>
              <tr>
                <th>Card Name</th>
                <th style={{ textAlign: 'center' }}>Need</th>
                <th style={{ textAlign: 'center' }}>Assigned</th>
                <th style={{ textAlign: 'center' }}>Gap</th>
                <th>Available in Other Decks</th>
              </tr>
            </thead>
            <tbody>
              {renderSection('Commander', grouped.commander)}
              {renderSection('Main Deck', Array.from(grouped.mainboard.values()).flat(), true)}
              {renderSection('Sideboard', grouped.sideboard)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
