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
    UNIQUE (deck_id, card_name)
);

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
