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

  const shortfallStyle: React.CSSProperties =
    card.shortfall > 0 ? { color: '#c0392b', fontWeight: 600 } : {};
  const unassignedStyle: React.CSSProperties =
    card.unassigned < 0
      ? { color: '#c0392b', fontWeight: 600 }
      : card.unassigned > 0
      ? { color: '#e67e22' }
      : {};

  return (
    <>
      <tr
        onClick={() => setExpanded((e) => !e)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <td style={{ padding: '0.4rem 0.6rem' }}>{card.card_name}</td>
        <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>{card.owned}</td>
        <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>{card.total_needed}</td>
        <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center', ...shortfallStyle }}>
          {card.shortfall}
        </td>
        <td style={{ padding: '0.4rem 0.6rem' }}>
          {localLocations.map((loc) => (
            <span
              key={loc.deck_id}
              style={{
                display: 'inline-block',
                marginRight: '0.3rem',
                padding: '0.1rem 0.4rem',
                borderRadius: '3px',
                fontSize: '0.78rem',
                background: loc.quantity_assigned === 0 ? '#ffeaa7' : '#dfe6e9',
                border: '1px solid #b2bec3',
                whiteSpace: 'nowrap',
              }}
            >
              {loc.deck_name}: {loc.quantity_assigned}/{loc.quantity_needed}
            </span>
          ))}
        </td>
        <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center', ...unassignedStyle }}>
          {card.unassigned < 0 ? `${card.unassigned} ⚠` : card.unassigned}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} style={{ padding: '0.5rem 1.5rem', background: '#f8f9fa' }}>
            <strong style={{ fontSize: '0.85rem', color: '#555' }}>Assign copies of "{card.card_name}":</strong>
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
