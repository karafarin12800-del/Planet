-- Bring every previously verified account to the new 140-token lifetime welcome entitlement.
-- Existing grants are calculated from immutable ledger entries, not the current spendable balance.
CREATE TABLE IF NOT EXISTS welcome_grant_v140_adjustments (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  applied INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO welcome_grant_v140_adjustments(user_id,applied)
SELECT u.id,0
FROM users u
WHERE u.welcome_granted_at IS NOT NULL
  AND EXISTS(SELECT 1 FROM wallets w WHERE w.user_id=u.id)
  AND 140 > COALESCE((
    SELECT SUM(l.delta) FROM wallet_ledger l
    WHERE l.user_id=u.id
      AND l.kind IN ('starter','welcome','welcome_adjustment')
  ),0);
UPDATE wallets
SET balance=balance+(
  140-COALESCE((
    SELECT SUM(l.delta) FROM wallet_ledger l
    WHERE l.user_id=wallets.user_id
      AND l.kind IN ('starter','welcome','welcome_adjustment')
  ),0)
)
WHERE user_id IN (SELECT user_id FROM welcome_grant_v140_adjustments WHERE applied=0);
INSERT OR IGNORE INTO wallet_ledger(user_id,delta,kind,reference)
SELECT user_id,
  140-COALESCE((
    SELECT SUM(l.delta) FROM wallet_ledger l
    WHERE l.user_id=welcome_grant_v140_adjustments.user_id
      AND l.kind IN ('starter','welcome','welcome_adjustment')
  ),0),
  'welcome_adjustment','welcome-adjustment-v140:'||user_id
FROM welcome_grant_v140_adjustments WHERE applied=0;
UPDATE welcome_grant_v140_adjustments SET applied=1 WHERE applied=0;
