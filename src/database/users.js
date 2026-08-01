const db = require('./db');
const config = require('../config');

function referralCode(telegramId) {
  return `ref_${telegramId}`;
}

function findUser(telegramId) {
  return db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(String(telegramId));
}

function createOrUpdateUser(from, startPayload) {
  const telegramId = String(from.id);
  const existing = findUser(telegramId);
  const code = referralCode(telegramId);
  const referrerCode = startPayload && startPayload.startsWith('ref_') ? startPayload : null;

  if (!existing) {
    db.prepare(`
      INSERT INTO users (telegram_id, first_name, username, referral_code, referred_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(telegramId, from.first_name || '', from.username || '', code, referrerCode);

    if (referrerCode && referrerCode !== code) {
      const referrer = db.prepare('SELECT * FROM users WHERE referral_code = ?').get(referrerCode);
      if (referrer) {
        db.prepare('INSERT OR IGNORE INTO referrals (referrer_id, referred_id, reward_points) VALUES (?, ?, ?)')
          .run(referrer.telegram_id, telegramId, config.referralRewardPoints);
        db.prepare('UPDATE users SET points = points + ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?')
          .run(config.referralRewardPoints, referrer.telegram_id);
      }
    }
  } else {
    db.prepare('UPDATE users SET first_name = ?, username = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?')
      .run(from.first_name || '', from.username || '', telegramId);
  }

  return findUser(telegramId);
}

function countUsers() {
  return db.prepare('SELECT COUNT(*) AS total FROM users').get().total;
}

function allUsers(options = {}) {
  if (options.vipOnly) {
    return db.prepare("SELECT telegram_id FROM users WHERE is_vip = 1 AND (vip_expires_at IS NULL OR vip_expires_at > datetime('now'))").all();
  }
  return db.prepare('SELECT telegram_id FROM users').all();
}

function addVip(telegramId, days) {
  const expires = new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('UPDATE users SET is_vip = 1, vip_expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?')
    .run(expires, String(telegramId));
  return expires;
}

function removeVip(telegramId) {
  db.prepare('UPDATE users SET is_vip = 0, vip_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?')
    .run(String(telegramId));
}

function expireVipUsers() {
  return db.prepare("UPDATE users SET is_vip = 0, vip_expires_at = NULL WHERE is_vip = 1 AND vip_expires_at IS NOT NULL AND vip_expires_at < datetime('now')").run();
}

module.exports = { referralCode, findUser, createOrUpdateUser, countUsers, allUsers, addVip, removeVip, expireVipUsers };
