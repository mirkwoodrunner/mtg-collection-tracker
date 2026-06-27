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
  cardName,
  deckId,
  deckName,
  quantityNeeded,
  quantityAssigned,
  onChanged,
}: Props) {
  const [value, setValue] = useState(quantityAssigned);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(quantityAssigned);
  }, [quantityAssigned]);

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
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0' }}>
      <span style={{ minWidth: '120px', fontSize: '0.9rem' }}>{deckName}</span>
      <span style={{ fontSize: '0.8rem', color: '#888', minWidth: '55px' }}>needs {quantityNeeded}</span>
      <button
        onClick={() => updateValue(value - 1)}
        style={{ width: '24px', height: '24px', padding: 0, cursor: 'pointer' }}
      >
        −
      </button>
      <span style={{ minWidth: '20px', textAlign: 'center' }}>{value}</span>
      <button
        onClick={() => updateValue(value + 1)}
        style={{ width: '24px', height: '24px', padding: 0, cursor: 'pointer' }}
      >
        +
      </button>
    </div>
  );
}
