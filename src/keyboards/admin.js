const { Markup } = require('telegraf');

const adminKeyboard = () => Markup.inlineKeyboard([
  [Markup.button.callback('📊 عدد المستخدمين', 'admin_stats')],
  [Markup.button.callback('📣 رسالة جماعية', 'admin_broadcast_help')],
  [Markup.button.callback('🚀 إرسال إشارة', 'admin_signal_help')]
]);

module.exports = adminKeyboard;
