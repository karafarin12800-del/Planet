-- Persist server-computed eligibility attributes for the special-creature market.
ALTER TABLE specimens ADD COLUMN body_length_cm REAL NOT NULL DEFAULT 0;
ALTER TABLE specimens ADD COLUMN is_special INTEGER NOT NULL DEFAULT 0;
ALTER TABLE specimens ADD COLUMN origin_world_type TEXT NOT NULL DEFAULT 'alien';
ALTER TABLE specimens ADD COLUMN rarity_score REAL NOT NULL DEFAULT 0;
ALTER TABLE specimens ADD COLUMN market_eligible INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS specimens_market_eligible_idx ON specimens(market_eligible,status,created_at);
