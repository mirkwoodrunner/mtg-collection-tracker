CREATE TABLE IF NOT EXISTS decks (
    id SERIAL PRIMARY KEY,
    moxfield_public_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    last_synced_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS deck_cards (
    id SERIAL PRIMARY KEY,
    deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    card_name TEXT NOT NULL,
    quantity_needed INTEGER NOT NULL,
    board TEXT NOT NULL DEFAULT 'mainboard',
    card_type TEXT,
    UNIQUE (deck_id, card_name, board)
);

-- Migrate existing installs: add columns and update unique constraint
ALTER TABLE deck_cards ADD COLUMN IF NOT EXISTS board TEXT NOT NULL DEFAULT 'mainboard';
ALTER TABLE deck_cards ADD COLUMN IF NOT EXISTS card_type TEXT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'deck_cards_deck_id_card_name_board_key'
    AND conrelid = 'deck_cards'::regclass
  ) THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'deck_cards_deck_id_card_name_key'
      AND conrelid = 'deck_cards'::regclass
    ) THEN
      ALTER TABLE deck_cards DROP CONSTRAINT deck_cards_deck_id_card_name_key;
    END IF;
    ALTER TABLE deck_cards ADD CONSTRAINT deck_cards_deck_id_card_name_board_key UNIQUE (deck_id, card_name, board);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS collection_cards (
    card_name TEXT PRIMARY KEY,
    quantity_owned INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    card_name TEXT NOT NULL,
    deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    quantity_assigned INTEGER NOT NULL CHECK (quantity_assigned > 0),
    UNIQUE (card_name, deck_id)
);
