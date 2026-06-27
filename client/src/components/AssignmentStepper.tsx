import { useState, useEffect, useRef } from 'react';
import { setAssignment } from '../api';

interface Props {
  cardName: string;
  deckId: number;
  deckName: string;
  quantityNeeded: number;
  quantityAssigned: number;
  onChanged: (deckId: number, newQty: number) => void;
}

export default function AssignmentStepper({
  cardName, deckId, deckName, quantityNeeded, quantityAssigned, onChanged,
}: Props) {
  const [value, setValue] = useState(quantityAssigned);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setValue(quantityAssigned); }, [quantityAssigned]);

  function updateValue(next: number) {
    if (next < 0) return;
    setValue(next);
    onChanged(deckId, next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await setAssignment(cardName, deckId, next);
      } catch {
        setValue(quantityAssigned);
        onChanged(deckId, quantityAssigned);
      }
    }, 500);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.3rem 0' }}>
      <span style={{ minWidth: '168px', fontSize: '0.85rem', color: 'var(--text)' }}>{deckName}</span>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', minWidth: '58px' }}>needs {quantityNeeded}</span>
      <button className="btn-stepper" onClick={() => updateValue(value - 1)}>−</button>
      <span style={{ minWidth: '22px', textAlign: 'center', fontWeight: 600, color: 'var(--text-bright)', fontSize: '0.9rem' }}>
        {value}
      </span>
      <button className="btn-stepper" onClick={() => updateValue(value + 1)}>+</button>
    </div>
  );
}
