const db = require('./db');

function ensureTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS opportunity_radar_watches (
      telegram_id TEXT NOT NULL,
      pair TEXT NOT NULL,
      last_state TEXT,
      last_score REAL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (telegram_id, pair)
    );

    CREATE INDEX IF NOT EXISTS idx_opportunity_radar_pair
      ON opportunity_radar_watches (pair);
  `);
}

function addWatch(telegramId, pair) {
  ensureTable();

  return db.prepare(`
    INSERT INTO opportunity_radar_watches
      (telegram_id, pair, last_state, last_score)
    VALUES (?, ?, 'WATCHING', NULL)
    ON CONFLICT(telegram_id, pair)
    DO UPDATE SET
      last_state = 'WATCHING',
      updated_at = CURRENT_TIMESTAMP
  `).run(
    String(telegramId),
    String(pair).toUpperCase()
  );
}

function removeWatch(telegramId, pair) {
  ensureTable();

  return db.prepare(`
    DELETE FROM opportunity_radar_watches
    WHERE telegram_id = ?
      AND pair = ?
  `).run(
    String(telegramId),
    String(pair).toUpperCase()
  );
}

function getWatches() {
  ensureTable();

  return db.prepare(`
    SELECT *
    FROM opportunity_radar_watches
    ORDER BY created_at ASC
  `).all();
}

function getUserWatches(telegramId) {
  ensureTable();

  return db.prepare(`
    SELECT *
    FROM opportunity_radar_watches
    WHERE telegram_id = ?
    ORDER BY created_at ASC
  `).all(String(telegramId));
}

function updateWatchState(
  telegramId,
  pair,
  state,
  score
) {
  ensureTable();

  return db.prepare(`
    UPDATE opportunity_radar_watches
    SET
      last_state = ?,
      last_score = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE telegram_id = ?
      AND pair = ?
  `).run(
    String(state),
    Number(score || 0),
    String(telegramId),
    String(pair).toUpperCase()
  );
}

module.exports = {
  ensureTable,
  addWatch,
  removeWatch,
  getWatches,
  getUserWatches,
  updateWatchState
};
