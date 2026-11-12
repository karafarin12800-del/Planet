-- Add the distinct 20-token starter grant to verified accounts created before the 120-token launch.
CREATE TABLE IF NOT EXISTS starter_token_adjustments (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  applied INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO starter_token_adjustments(user_id,applied)
SELECT u.id,0 FROM users u
WHERE u.welcome_granted_at IS NOT NULL
  AND NOT EXISTS(SELECT 1 FROM wallet_ledger l WHERE l.user_id=u.id AND l.kind='starter' AND l.delta=20);
UPDATE wallets SET balance=balance+20
WHERE user_id IN (SELECT user_id FROM starter_token_adjustments WHERE applied=0);
INSERT OR IGNORE INTO wallet_ledger(user_id,delta,kind,reference)
SELECT user_id,20,'starter','starter-adjustment-v120:'||user_id
FROM starter_token_adjustments WHERE applied=0;
UPDATE starter_token_adjustments SET applied=1 WHERE applied=0;

CREATE TABLE IF NOT EXISTS planet_world_seeds (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  galaxy_planet_id TEXT NOT NULL,
  seed TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id,galaxy_planet_id)
);
