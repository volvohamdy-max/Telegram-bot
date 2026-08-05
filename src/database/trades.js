const db = require('./db');

function addTrade(data) {
  return db.prepare(`
    INSERT INTO trades
    (telegram_id, pair, action, entry, stop_loss, target1, target2)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    String(data.telegram_id),
    data.pair,
    data.action,
    data.entry,
    data.stop_loss,
    data.target1,
    data.target2
  );
}

function getOpenTrades() {
  return db.prepare(
    "SELECT * FROM trades WHERE status = 'open'"
  ).all();
}

function updateTradeStatus(id, status) {
  return db.prepare(
    "UPDATE trades SET status = ? WHERE id = ?"
  ).run(status, id);
}

module.exports = {
  addTrade,
  getOpenTrades,
  updateTradeStatus
};
