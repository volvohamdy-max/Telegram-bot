
const { Telegraf } = require('telegraf');
const config = require('./config');
const initDatabase = require('./database/init');
const db = require('./database/db');
const registerStart = require('./commands/start');
const registerUserCommands = require('./commands/user');
const registerAdminCommands = require('./admin/adminCommands');
const startScheduler = require('./services/scheduler');

async function main() {
  console.log('Starting Telegram Forex AI bot...');

  if (!config.botToken) {
    console.error('BOT_TOKEN is required. Copy .env.example to .env and configure it.');
    process.exit(1);
  }

  await db.ready;
initDatabase();
  console.log('Database is ready.');

  const bot = new Telegraf(config.botToken);
  await bot.telegram.setMyCommands([
  {
    command: 'start',
    description: '🚀 بدء استخدام البوت'
  },
  {
    command: 'menu',
    description: '📋 القائمة الرئيسية'
  },
  {
    command: 'analyze',
    description: '📈 تحليل زوج (مثال EURUSD)'
  },
  {
    command: 'gold',
    description: '🥇 تحليل الذهب XAUUSD'
  },
  {
    command: 'vip',
    description: '💎 اشتراك VIP'
  },
  {
    command: 'ref',
    description: '🔗 رابط الإحالة'
  },
  {
    command: 'status',
    description: '👤 حالة الحساب'
  },
  {
    command: 'help',
    description: 'ℹ️ المساعدة'
  }
]);
console.log('Commands menu set');
  registerStart(bot);
  registerUserCommands(bot);
  registerAdminCommands(bot);
  console.log('Commands are registered.');

  bot.catch((error, ctx) => {
    console.error(`Bot error for update ${ctx.update.update_id}:`, error);
    ctx.reply('حدث خطأ مؤقت، حاول لاحقا.').catch(() => null);
  });

  startScheduler(bot);
  console.log('Scheduler started.');

  try {
    await bot.launch();
    console.log('Telegram Forex AI bot is running. Open Telegram and send /start to your bot.');
  } catch (error) {
    console.error('Failed to launch Telegram bot. Check BOT_TOKEN and internet connection.');
    console.error(error.message);
    process.exit(1);
  }

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main();
