PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_salt TEXT, password_hash TEXT,
  google_sub TEXT UNIQUE, verified_at TEXT, welcome_granted_at TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS email_verifications (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL, expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS wallets (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK(balance >= 0)
);
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id),
  delta INTEGER NOT NULL, kind TEXT NOT NULL, reference TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL, product_id TEXT NOT NULL, receipt_hash TEXT NOT NULL UNIQUE,
  token_amount INTEGER NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS specimens (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), client_key TEXT NOT NULL,
  planet_id TEXT NOT NULL, name TEXT NOT NULL, form TEXT NOT NULL, dna TEXT NOT NULL, generation INTEGER NOT NULL DEFAULT 0,
  fitness REAL NOT NULL DEFAULT 0, status TEXT NOT NULL CHECK(status IN ('owned','listed')),
  created_at TEXT NOT NULL, UNIQUE(owner_id,client_key)
);
CREATE INDEX IF NOT EXISTS specimens_owner_idx ON specimens(owner_id,status);
CREATE TABLE IF NOT EXISTS planet_ownership (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  planet_id TEXT NOT NULL, price INTEGER NOT NULL CHECK(price > 0), created_at TEXT NOT NULL,
  PRIMARY KEY(user_id,planet_id)
);
CREATE INDEX IF NOT EXISTS planet_ownership_user_idx ON planet_ownership(user_id,created_at);
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY, specimen_id TEXT NOT NULL UNIQUE REFERENCES specimens(id),
  seller_id TEXT NOT NULL REFERENCES users(id), buyer_id TEXT REFERENCES users(id),
  price INTEGER NOT NULL CHECK(price > 0), status TEXT NOT NULL CHECK(status IN ('active','sold','cancelled')),
  created_at TEXT NOT NULL, sold_at TEXT
);
CREATE INDEX IF NOT EXISTS listings_active_idx ON listings(status,created_at);

CREATE TABLE IF NOT EXISTS vip_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, product_id TEXT NOT NULL, receipt_hash TEXT NOT NULL UNIQUE,
  started_at TEXT NOT NULL, expires_at TEXT NOT NULL, auto_renewing INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vip_subscriptions_user_idx ON vip_subscriptions(user_id,expires_at);
CREATE TABLE IF NOT EXISTS vip_entitlements (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL, last_daily_claim_date TEXT
);
