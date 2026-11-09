-- One-time +80 token adjustment for accounts that previously received the old 20-token welcome grant.
CREATE TABLE IF NOT EXISTS welcome_grant_adjustments (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  applied INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO welcome_grant_adjustments(user_id,applied)
SELECT u.id,0 FROM users u
WHERE u.welcome_granted_at IS NOT NULL
  AND EXISTS(SELECT 1 FROM wallet_ledger l WHERE l.user_id=u.id AND l.kind='welcome' AND l.delta=20);
UPDATE wallets
SET balance=balance+80
WHERE user_id IN (SELECT user_id FROM welcome_grant_adjustments WHERE applied=0);
INSERT OR IGNORE INTO wallet_ledger(user_id,delta,kind,reference)
SELECT user_id,80,'welcome_adjustment','welcome-adjustment-v100:'||user_id
FROM welcome_grant_adjustments WHERE applied=0;
UPDATE welcome_grant_adjustments SET applied=1 WHERE applied=0;
