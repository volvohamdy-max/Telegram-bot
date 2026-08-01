require('dotenv').config();

function list(value = '') {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

module.exports = {
  botToken: process.env.BOT_TOKEN,
  adminIds: list(process.env.ADMIN_IDS).map(String),
  botUsername: process.env.BOT_USERNAME || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  databasePath: process.env.DATABASE_PATH || './data/bot.sqlite',
  paymentInfo: process.env.PAYMENT_INFO || 'تواصل مع الأدمن لإتمام الدفع.',
  referralRewardPoints: Number(process.env.REFERRAL_REWARD_POINTS || 10),
  vipReferralBonusDays: Number(process.env.VIP_REFERRAL_BONUS_DAYS || 3),
  signalCron: process.env.SIGNAL_CRON || '*/30 * * * *',
  marketApiUrl: process.env.MARKET_API_URL || ''
};
