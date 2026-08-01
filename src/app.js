const { Telegraf } = require('telegraf');
const config = require('./config');
const initDatabase = require('./database/init');
const registerStart = require('./commands/start');
const registerUserCommands = require('./commands/user');
const registerAdminCommands = require('./admin/adminCommands');
const startScheduler = require('./services/scheduler');

if (!config.botToken) {
  console.error('BOT_TOKEN is required. Copy .env.example to .env and configure it.');
  process.exit(1);
}

initDatabase();

const bot = new Telegraf(config.botToken);

registerStart(bot);
registerUserCommands(bot);
registerAdminCommands(bot);

bot.catch((error, ctx) => {
  console.error(`Bot error for update ${ctx.update.update_id}:`, error);
  ctx.reply('حدث خطأ مؤقت، حاول لاحقا.').catch(() => null);
});

startScheduler();

bot.launch();
console.log('Telegram Forex AI bot is running...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
