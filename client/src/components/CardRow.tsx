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

  const free = Number(card.owned) - localLocations.reduce((sum, loc) => sum + Number(loc.quantity_assigned), 0);
  const shortfall = Number(card.shortfall);

  return (
    <>
      <tr className="clickable" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded}>
        <td className="card-name">
          <span className="caret" aria-hidden="true">{expanded ? '▼' : '▶'}</span>
          {card.card_name}
        </td>
        <td className="num">{card.owned}</td>
        <td className="num">{card.total_needed}</td>
        <td className={`num${shortfall > 0 ? ' warn' : ' dim'}`}>{shortfall > 0 ? shortfall : '—'}</td>
        <td>
          <div className="chips">
            {localLocations.map((loc) => (
              <span key={loc.deck_id} className={`chip${Number(loc.quantity_assigned) === 0 ? ' empty' : ''}`}>
                {loc.deck_name} {loc.quantity_assigned}/{loc.quantity_needed}
              </span>
            ))}
          </div>
        </td>
        <td className={`num${free < 0 ? ' warn' : free === 0 ? ' dim' : ''}`}>{free}</td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={6} className="expand-cell">
            {localLocations.map((loc) => (
              <AssignmentStepper
                key={loc.deck_id}
                cardName={card.card_name}
                deckId={loc.deck_id}
                deckName={loc.deck_name}
                quantityNeeded={loc.quantity_needed}
                quantityAssigned={loc.quantity_assigned}
                canAdd={free > 0}
                onChanged={handleStepperChange}
              />
            ))}
          </td>
        </tr>
      )}
    </>
  );
}
