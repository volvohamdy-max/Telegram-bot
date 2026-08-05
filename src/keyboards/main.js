const { Markup } = require('telegraf');

const mainKeyboard = () =>
  Markup.keyboard([
  ['📈 تحليل زوج'],
  ['💎 VIP', '🔗 الإحالة'],
  ['👤 حالة الحساب', 'ℹ️ المساعدة'],
  ['👥 الجروب الرئيسي', '🎧 الدعم']
]).resize();

const vipKeyboard = () =>
  Markup.inlineKeyboard([
    [Markup.button.callback('شهري - 30 يوم', 'vip_monthly')],
    [Markup.button.callback('ثلاثي - 90 يوم', 'vip_quarterly')],
    [Markup.button.callback('سنوي - 365 يوم', 'vip_yearly')]
  ]);

module.exports = {
  mainKeyboard,
  vipKeyboard
};
