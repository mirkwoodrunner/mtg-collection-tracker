import { useState, useEffect, useRef } from 'react';
import { setAssignment } from '../api';

interface Props {
  cardName: string;
  deckId: number;
  deckName: string;
  quantityNeeded: number;
  quantityAssigned: number;
  canAdd: boolean;
  onChanged: (deckId: number, newQty: number) => void;
}

export default function AssignmentStepper({
  cardName, deckId, deckName, quantityNeeded, quantityAssigned, canAdd, onChanged,
}: Props) {
  const [value, setValue] = useState(quantityAssigned);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Last value the server accepted, used to roll back a rejected change.
  const savedRef = useRef(quantityAssigned);

  useEffect(() => { setValue(quantityAssigned); }, [quantityAssigned]);

  function updateValue(next: number) {
    if (next < 0) return;
    if (next > value && !canAdd) return;
    setValue(next);
    onChanged(deckId, next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await setAssignment(cardName, deckId, next);
        savedRef.current = next;
      } catch {
        setValue(savedRef.current);
        onChanged(deckId, savedRef.current);
      }
    }, 500);
  }

  return (
    <div className="stepper-row">
      <span className="stepper-deck">{deckName}</span>
      <span className="stepper-need">needs {quantityNeeded}</span>
      <button
        className="btn-stepper"
        onClick={() => updateValue(value - 1)}
        disabled={value === 0}
        aria-label={`Remove one from ${deckName}`}
      >
        −
      </button>
      <span className="stepper-val">{value}</span>
      <button
        className="btn-stepper"
        onClick={() => updateValue(value + 1)}
        disabled={!canAdd}
        aria-label={`Add one to ${deckName}`}
        title={canAdd ? undefined : 'No unassigned copies left'}
      >
        +
      </button>
    </div>
  );
}
