-- YOYA Pharmacy Vendor & Anti-Sharing Registry Schema for Cloudflare D1 (SQLite)
-- Run: wrangler d1 execute yoya_vendor_db --file=./schema.sql

CREATE TABLE IF NOT EXISTS vendor_installations (
  installation_id TEXT PRIMARY KEY,
  clinic_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_claimed INTEGER NOT NULL DEFAULT 0,
  total_accounts_created INTEGER NOT NULL DEFAULT 0,
  total_workers INTEGER NOT NULL DEFAULT 0,
  active_workers INTEGER NOT NULL DEFAULT 0,
  managers_count INTEGER NOT NULL DEFAULT 0,
  sellers_count INTEGER NOT NULL DEFAULT 0,
  drugs_count INTEGER NOT NULL DEFAULT 0,
  transactions_count INTEGER NOT NULL DEFAULT 0,
  seen_origins_json TEXT NOT NULL DEFAULT '[]',
  seen_hosts_json TEXT NOT NULL DEFAULT '[]',
  machine_fingerprints_json TEXT NOT NULL DEFAULT '[]',
  ip_hashes_json TEXT NOT NULL DEFAULT '[]',
  sharing_suspected INTEGER NOT NULL DEFAULT 0,
  sharing_reasons_json TEXT NOT NULL DEFAULT '[]',
  accounts_json TEXT NOT NULL DEFAULT '[]',
  blocked_accounts_json TEXT NOT NULL DEFAULT '[]',
  feature_locks_json TEXT NOT NULL DEFAULT '{}',
  license_status TEXT NOT NULL DEFAULT 'active' CHECK (license_status IN ('active', 'revoked', 'banned')),
  license_reason TEXT NOT NULL DEFAULT '',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);
