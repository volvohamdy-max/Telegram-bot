const db = require('./db');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT NOT NULL UNIQUE,
      first_name TEXT,
      username TEXT,
      registered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      referral_code TEXT NOT NULL UNIQUE,
      referred_by TEXT,
      points INTEGER NOT NULL DEFAULT 0,
      is_vip INTEGER NOT NULL DEFAULT 0,
      vip_expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vip_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT NOT NULL,
      plan_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      proof_file_id TEXT,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id TEXT NOT NULL,
      referred_id TEXT NOT NULL UNIQUE,
      reward_points INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pair TEXT,
      direction TEXT,
      entry TEXT,
      stop_loss TEXT,
      targets TEXT,
      confidence INTEGER,
      reason TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
CREATE TABLE IF NOT EXISTS signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pair TEXT,
  direction TEXT,
  entry TEXT,
  stop_loss TEXT,
  targets TEXT,
  confidence INTEGER,
  reason TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT,
  pair TEXT,
  action TEXT,
  entry REAL,
  stop_loss REAL,
  target1 REAL,
  target2 REAL,
  status TEXT DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS news_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    news_id TEXT UNIQUE,
    alert_sent INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
  `);
}

if (require.main === module) {
  initDatabase();
  console.log('Database initialized');
}

module.exports = initDatabase;
