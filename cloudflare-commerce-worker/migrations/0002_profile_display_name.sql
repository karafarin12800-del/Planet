-- Player-selected public name shown beside owned planets.
ALTER TABLE users ADD COLUMN display_name TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_display_name_unique ON users(lower(display_name)) WHERE display_name IS NOT NULL;