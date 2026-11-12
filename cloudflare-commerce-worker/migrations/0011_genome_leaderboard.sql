-- Server-authoritative per-player, per-planet genome high scores.
CREATE TABLE IF NOT EXISTS genome_scores (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  planet_id TEXT NOT NULL,
  score INTEGER NOT NULL CHECK(score >= 0),
  species_count INTEGER NOT NULL CHECK(species_count >= 0),
  special_count INTEGER NOT NULL CHECK(special_count >= 0 AND special_count <= species_count),
  updated_at TEXT NOT NULL,
  PRIMARY KEY(user_id,planet_id)
);
CREATE INDEX IF NOT EXISTS genome_scores_rank_idx ON genome_scores(score DESC,updated_at);
