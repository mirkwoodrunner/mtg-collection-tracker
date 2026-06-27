export interface Deck {
  id: number;
  moxfield_public_id: string;
  name: string;
  last_synced_at: string | null;
}

export interface CardLocation {
  deck_id: number;
  deck_name: string;
  quantity_needed: number;
  quantity_assigned: number;
}

export interface CardRow {
  card_name: string;
  owned: number;
  total_needed: number;
  shortfall: number;
  assigned_total: number;
  unassigned: number;
  locations: CardLocation[];
}

export interface Assignment {
  id: number;
  card_name: string;
  deck_id: number;
  quantity_assigned: number;
}
