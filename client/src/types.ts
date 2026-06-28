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

export interface DeckCardDetail {
  card_name: string;
  board: string;
  card_type: string | null;
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

export interface TokenRow {
  card_name: string;
  type_line: string | null;
  oracle_text: string | null;
  colors: string;
  power: string | null;
  toughness: string | null;
  deck_names: string[];
}
