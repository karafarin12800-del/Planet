-- Persist server-verified Cafe Bazaar VIP subscriptions and server-day reward claims.
CREATE TABLE IF NOT EXISTS vip_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  product_id TEXT NOT NULL,
  receipt_hash TEXT NOT NULL UNIQUE,
  started_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  auto_renewing INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vip_subscriptions_user_idx ON vip_subscriptions(user_id,expires_at);
CREATE TABLE IF NOT EXISTS vip_entitlements (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  last_daily_claim_date TEXT
);
