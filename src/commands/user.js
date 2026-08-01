const config = require('../config');
const { findUser } = require('../database/users');
const { vipKeyboard, mainKeyboard } = require('../keyboards/main');
const { plans, createVipRequest } = require('../services/vipService');
const { analyzePair } = require('../services/analysisService');
const { formatSignal } = require('../utils/format');

function registerUserCommands(bot) {
  bot.command('menu', (ctx) => ctx.reply('اختر من القائمة:', mainKeyboard()));
  bot.command('vip', (ctx) => ctx.reply(`اختر خطة VIP:\n\n${config.paymentInfo}`, vipKeyboard()));
  bot.command('ref', (ctx) => {
    const user = findUser(ctx.from.id);
    const link = `https://t.me/${config.botUsername}?start=${user.referral_code}`;
    return ctx.reply(`رابط إحالتك:\n${link}\nنقاطك: ${user.points}`);
  });
  bot.command('analyze', async (ctx) => {
    const pair = ctx.message.text.split(' ')[1] || 'EURUSD';
    const result = await analyzePair(pair);
    return ctx.reply(`تحليل ${result.pair}\n${formatSignal(result.signal)}`);
  });

  bot.hears('💎 VIP', (ctx) => ctx.reply(`اختر خطة VIP:\n\n${config.paymentInfo}`, vipKeyboard()));
  bot.hears('🔗 الإحالة', (ctx) => ctx.telegram.sendMessage(ctx.chat.id, '/ref'));
  bot.hears('📈 تحليل زوج', (ctx) => ctx.reply('اكتب الأمر هكذا: /analyze EURUSD'));
  bot.hears('ℹ️ المساعدة', (ctx) => ctx.reply('الأوامر: /menu /vip /ref /analyze EURUSD'));

  Object.entries(plans).forEach(([key, plan]) => {
    bot.action(`vip_${key}`, async (ctx) => {
      createVipRequest(ctx.from.id, key);
      await ctx.answerCbQuery();
      return ctx.reply(`تم تسجيل طلب خطة ${plan.label}. أرسل إثبات الدفع هنا وسيصل للأدمن.`);
    });
  });

  bot.on(['photo', 'document'], async (ctx, next) => {
    const caption = ctx.message.caption || '';
    if (!caption.includes('VIP') && !caption.includes('دفع')) return next();
    const fileId = ctx.message.photo?.at(-1)?.file_id || ctx.message.document?.file_id;
    createVipRequest(ctx.from.id, 'manual', fileId, caption);
    await Promise.all(config.adminIds.map((id) => ctx.forwardMessage(id).catch(() => null)));
    return ctx.reply('تم إرسال إثبات الدفع للأدمن.');
  });
}

module.exports = registerUserCommands;
