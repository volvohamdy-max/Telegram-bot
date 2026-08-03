const cron = require('node-cron');
const { expireVipUsers } = require('../database/users');

function startScheduler() {
  cron.schedule('0 * * * *', () => {
    const result = expireVipUsers();
    if (result.changes) console.log(`Expired VIP users: ${result.changes}`);
  });
}

module.exports = startScheduler;
