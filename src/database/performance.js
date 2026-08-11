const db = require('./db');

function ensureTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS trade_performance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_id INTEGER UNIQUE NOT NULL,
      telegram_id TEXT,
      pair TEXT NOT NULL,
      action TEXT NOT NULL,
      entry REAL,
      stop_loss REAL,
      target1 REAL,
      target2 REAL,
      opened_at TEXT,
      tp1_hit INTEGER NOT NULL DEFAULT 0,
      tp2_hit INTEGER NOT NULL DEFAULT 0,
      sl_hit INTEGER NOT NULL DEFAULT 0,
      tp1_at TEXT,
      closed_at TEXT,
      exit_price REAL,
      outcome TEXT,
      realized_r REAL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function nowSql() {
  return new Date().toISOString();
}

function riskDistance(trade) {
  const entry = Number(trade.entry);
  const sl = Number(trade.stop_loss);

  if (!Number.isFinite(entry) || !Number.isFinite(sl)) return null;

  const risk = Math.abs(entry - sl);
  return risk > 0 ? risk : null;
}

function realizedR(trade, exitPrice, outcome) {
  const risk = riskDistance(trade);
  if (!risk) return null;

  if (outcome === 'SL' || outcome === 'TP1_THEN_SL') {
    return -1;
  }

  const entry = Number(trade.entry);
  const exit = Number(exitPrice);

  if (!Number.isFinite(entry) || !Number.isFinite(exit)) return null;

  const reward = Math.abs(exit - entry);
  return Number((reward / risk).toFixed(3));
}

function ensureTradeTracked(trade) {
  ensureTable();

  const exists = db.prepare(
    'SELECT trade_id FROM trade_performance WHERE trade_id = ?'
  ).get(Number(trade.id));

  if (exists) return;

  db.prepare(`
    INSERT INTO trade_performance
    (
      trade_id, telegram_id, pair, action,
      entry, stop_loss, target1, target2,
      opened_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    Number(trade.id),
    trade.telegram_id != null ? String(trade.telegram_id) : null,
    String(trade.pair || '').toUpperCase(),
    String(trade.action || '').toUpperCase(),
    Number(trade.entry),
    Number(trade.stop_loss),
    Number(trade.target1),
    Number(trade.target2),
    trade.created_at || nowSql()
  );
}

function recordTp1(trade, price) {
  ensureTradeTracked(trade);

  db.prepare(`
    UPDATE trade_performance
    SET
      tp1_hit = 1,
      tp1_at = COALESCE(tp1_at, ?),
      exit_price = ?,
      outcome = CASE
        WHEN outcome IS NULL OR outcome = '' THEN 'TP1_OPEN'
        ELSE outcome
      END,
      updated_at = ?
    WHERE trade_id = ?
  `).run(
    nowSql(),
    Number(price),
    nowSql(),
    Number(trade.id)
  );
}

function recordTp2(trade, price) {
  ensureTradeTracked(trade);

  const r = realizedR(trade, trade.target2 ?? price, 'TP2');

  db.prepare(`
    UPDATE trade_performance
    SET
      tp1_hit = 1,
      tp2_hit = 1,
      tp1_at = COALESCE(tp1_at, ?),
      closed_at = ?,
      exit_price = ?,
      outcome = 'TP2',
      realized_r = ?,
      updated_at = ?
    WHERE trade_id = ?
  `).run(
    nowSql(),
    nowSql(),
    Number(price),
    r,
    nowSql(),
    Number(trade.id)
  );
}

function recordSl(trade, price) {
  ensureTradeTracked(trade);

  const existing = db.prepare(
    'SELECT tp1_hit FROM trade_performance WHERE trade_id = ?'
  ).get(Number(trade.id));

  const tp1Hit = Number(existing?.tp1_hit || 0) === 1;
  const outcome = tp1Hit ? 'TP1_THEN_SL' : 'SL';
  const r = realizedR(trade, price, outcome);

  db.prepare(`
    UPDATE trade_performance
    SET
      sl_hit = 1,
      closed_at = ?,
      exit_price = ?,
      outcome = ?,
      realized_r = ?,
      updated_at = ?
    WHERE trade_id = ?
  `).run(
    nowSql(),
    Number(price),
    outcome,
    r,
    nowSql(),
    Number(trade.id)
  );
}

function getStats(days) {
  ensureTable();

  const cutoff = new Date(
    Date.now() - Number(days) * 24 * 60 * 60 * 1000
  ).toISOString();

  const rows = db.prepare(`
    SELECT *
    FROM trade_performance
    WHERE opened_at >= ?
    ORDER BY opened_at DESC
  `).all(cutoff);

  const closed = rows.filter((x) => x.closed_at);
  const active = rows.filter((x) => !x.closed_at);

  const waitingTp2 = active.filter(
    (x) => Number(x.tp1_hit) === 1
  ).length;

  const open = active.filter(
    (x) => Number(x.tp1_hit) !== 1
  ).length;

  const tp1 = rows.filter(
    (x) => Number(x.tp1_hit) === 1
  ).length;

  const tp2 = rows.filter(
    (x) => Number(x.tp2_hit) === 1
  ).length;

  const sl = rows.filter(
    (x) => Number(x.sl_hit) === 1
  ).length;

  const rValues = closed
    .filter((x) => x.realized_r !== null && x.realized_r !== undefined)
    .map((x) => Number(x.realized_r))
    .filter(Number.isFinite);

  const avgR = rValues.length
    ? rValues.reduce((a, b) => a + b, 0) / rValues.length
    : null;

  const totalR = rValues.length
    ? rValues.reduce((a, b) => a + b, 0)
    : null;

  const reachedRValues = rows.map((row) => {
    const entry = Number(row.entry);
    const stop = Number(row.stop_loss);
    const risk = Math.abs(entry - stop);

    if (!Number.isFinite(risk) || risk <= 0) return null;

    if (Number(row.tp2_hit) === 1) {
      const tp2Target = Number(row.target2);
      return Number.isFinite(tp2Target)
        ? Math.abs(tp2Target - entry) / risk
        : null;
    }

    if (Number(row.tp1_hit) === 1) {
      const tp1Target = Number(row.target1);
      return Number.isFinite(tp1Target)
        ? Math.abs(tp1Target - entry) / risk
        : null;
    }

    return null;
  }).filter((x) => Number.isFinite(x));

  const reachedR = reachedRValues.length
    ? reachedRValues.reduce((a, b) => a + b, 0)
    : null;

  const byPair = {};

  for (const row of rows) {
    const pair = row.pair || 'UNKNOWN';

    if (!byPair[pair]) {
      byPair[pair] = {
        total: 0,
        closed: 0,
        tp1: 0,
        tp2: 0,
        sl: 0
      };
    }

    byPair[pair].total += 1;

    if (row.closed_at) {
      byPair[pair].closed += 1;
    }

    if (Number(row.tp1_hit) === 1) byPair[pair].tp1 += 1;
    if (Number(row.tp2_hit) === 1) byPair[pair].tp2 += 1;
    if (Number(row.sl_hit) === 1) byPair[pair].sl += 1;
  }

  return {
    days: Number(days),
    total: rows.length,
    open,
    waitingTp2,
    closed: closed.length,
    tp1,
    tp2,
    sl,
    tp1Rate: rows.length ? (tp1 / rows.length) * 100 : 0,
    tp2Rate: rows.length ? (tp2 / rows.length) * 100 : 0,
    slRate: rows.length ? (sl / rows.length) * 100 : 0,
    avgR,
    totalR,
    reachedR,
    byPair
  };
}

module.exports = {
  ensureTable,
  ensureTradeTracked,
  recordTp1,
  recordTp2,
  recordSl,
  getStats
};
