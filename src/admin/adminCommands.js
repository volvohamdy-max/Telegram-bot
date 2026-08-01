const adminKeyboard = require('../keyboards/admin');
const { requireAdmin } = require('../utils/auth');
const { countUsers, allUsers, addVip, removeVip } = require('../database/users');

async function sendToAll(ctx, message, vipOnly = false) {
  const users = allUsers({ vipOnly });
  let sent = 0;
  for (const user of users) {
    try {
      await ctx.telegram.sendMessage(user.telegram_id, message);
      sent += 1;
    } catch (error) {
      console.error(`Send failed to ${user.telegram_id}:`, error.message);
    }
  }
  return sent;
}

function registerAdminCommands(bot) {
  bot.command('admin', (ctx) => {
    if (!requireAdmin(ctx)) return;
    return ctx.reply('لوحة الأدمن', adminKeyboard());
  });

  bot.action('admin_stats', (ctx) => requireAdmin(ctx) && ctx.reply(`عدد المستخدمين: ${countUsers()}`));
  bot.action('admin_broadcast_help', (ctx) => requireAdmin(ctx) && ctx.reply('استخدم: /broadcast نص الرسالة'));
  bot.action('admin_signal_help', (ctx) => requireAdmin(ctx) && ctx.reply('استخدم: /signal نص الإشارة'));

  bot.command('addvip', (ctx) => {
    if (!requireAdmin(ctx)) return;
    const [, telegramId, days = 30] = ctx.message.text.split(' ');
    if (!telegramId) return ctx.reply('استخدم: /addvip <telegram_id> <days>');
    const expires = addVip(telegramId, days);
    return ctx.reply(`تم تفعيل VIP حتى ${expires}`);
  });

  bot.command('removevip', (ctx) => {
    if (!requireAdmin(ctx)) return;
    const [, telegramId] = ctx.message.text.split(' ');
    if (!telegramId) return ctx.reply('استخدم: /removevip <telegram_id>');
    removeVip(telegramId);
    return ctx.reply('تم حذف VIP.');
  });

  bot.command('broadcast', async (ctx) => {
    if (!requireAdmin(ctx)) return;
    const message = ctx.message.text.replace('/broadcast', '').trim();
    if (!message) return ctx.reply('استخدم: /broadcast نص الرسالة');
    const sent = await sendToAll(ctx, message);
    return ctx.reply(`تم الإرسال إلى ${sent} مستخدم.`);
  });

  bot.command('signal', async (ctx) => {
    if (!requireAdmin(ctx)) return;
    const message = ctx.message.text.replace('/signal', '').trim();
    if (!message) return ctx.reply('استخدم: /signal نص الإشارة');
    const sent = await sendToAll(ctx, `🚀 إشارة VIP\n${message}`, true);
    return ctx.reply(`تم إرسال الإشارة إلى ${sent} مستخدم.`);
  });
}

module.exports = registerAdminCommands;
