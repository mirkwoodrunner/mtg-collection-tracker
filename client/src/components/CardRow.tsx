import { useState } from 'react';
import type { CardRow as CardRowType, CardLocation } from '../types';
import AssignmentStepper from './AssignmentStepper';

interface Props {
  card: CardRowType;
  onAssignmentChanged: (cardName: string, deckId: number, newQty: number) => void;
}

export default function CardRow({ card, onAssignmentChanged }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [localLocations, setLocalLocations] = useState<CardLocation[]>(card.locations);

  function handleStepperChange(deckId: number, newQty: number) {
    setLocalLocations((prev) =>
      prev.map((loc) => (loc.deck_id === deckId ? { ...loc, quantity_assigned: newQty } : loc))
    );
    onAssignmentChanged(card.card_name, deckId, newQty);
  }

  const shortfallClass = card.shortfall > 0 ? 'text-red' : '';
  const unassignedClass =
    card.unassigned < 0 ? 'text-red' : card.unassigned > 0 ? 'text-orange' : 'text-dim';

  return (
    <>
      <tr
        onClick={() => setExpanded((e) => !e)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <td style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500, color: 'var(--text-bright)' }}>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', flexShrink: 0 }}>
            {expanded ? '▼' : '▶'}
          </span>
          {card.card_name}
        </td>
        <td style={{ textAlign: 'center' }}>{card.owned}</td>
        <td style={{ textAlign: 'center' }}>{card.total_needed}</td>
        <td className={shortfallClass} style={{ textAlign: 'center' }}>
          {card.shortfall > 0 ? `−${card.shortfall}` : '—'}
        </td>
        <td>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {localLocations.map((loc) => (
              <span
                key={loc.deck_id}
                className={`loc-chip ${loc.quantity_assigned === 0 ? 'loc-chip-unassigned' : 'loc-chip-default'}`}
              >
                {loc.deck_name}: {loc.quantity_assigned}/{loc.quantity_needed}
              </span>
            ))}
          </div>
        </td>
        <td className={unassignedClass} style={{ textAlign: 'center' }}>
          {card.unassigned < 0 ? `${card.unassigned} ⚠` : card.unassigned}
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={6} style={{ padding: '0.85rem 1.25rem 0.85rem 2.5rem', background: '#0f1119', borderTop: '1px solid var(--border)' }}>
            <div className="section-label" style={{ marginBottom: '0.75rem' }}>
              Assign copies of "{card.card_name}"
            </div>
            {localLocations.map((loc) => (
              <AssignmentStepper
                key={loc.deck_id}
                cardName={card.card_name}
                deckId={loc.deck_id}
                deckName={loc.deck_name}
                quantityNeeded={loc.quantity_needed}
                quantityAssigned={loc.quantity_assigned}
                onChanged={handleStepperChange}
              />
            ))}
          </td>
        </tr>
      )}
    </>
  );
}
