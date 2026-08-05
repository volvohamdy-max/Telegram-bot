const config = require('../config');
const { findUser } = require('../database/users');
const { vipKeyboard, mainKeyboard } = require('../keyboards/main');
const { plans, createVipRequest } = require('../services/vipService');
const { analyzePair } = require('../services/analysisService');
const { formatSignal } = require('../utils/format');
const { getSignal, saveSignal } = require('../services/signalCache');
function registerUserCommands(bot) {
bot.command('status', (ctx) => {
  const user = findUser(ctx.from.id);

  if (!user) {
    return ctx.reply('اكتب /start أولاً');
  }
return ctx.reply(`👤 حالة الحساب

🆔 ID: ${ctx.from.id}

VIP: ${user.is_vip ? '✅ مفعل' : '❌ غير مفعل'}
النقاط: ${user.points || 0}
`);
});
  bot.command('menu', (ctx) => ctx.reply('اختر من القائمة:', mainKeyboard()));
  bot.command('vip', (ctx) => ctx.reply(`اختر خطة VIP:\n\n${config.paymentInfo}`, vipKeyboard()));
  bot.command('ref', (ctx) => {
    const user = findUser(ctx.from.id);
    const link = `https://t.me/${config.botUsername}?start=${user.referral_code}`;
    return ctx.reply(`رابط إحالتك:\n${link}\nنقاطك: ${user.points}`);
  });
bot.command('analyze', async (ctx) => {

  const pair = (ctx.message.text.split(' ')[1] || 'EURUSD').toUpperCase();

  let result = getSignal(pair);

  if (!result) {
    result = await analyzePair(pair);
    saveSignal(pair, result);
  }

  return ctx.reply(`تحليل ${result.pair}\n${formatSignal(result.signal)}`);

});
 const PAIRS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "USDCAD",
  "USDCHF",
  "NZDUSD",
  "EURJPY",
  "GBPJPY",
  "XAUUSD"
];

PAIRS.forEach(pair => {
  bot.action(`pair_${pair}`, async (ctx) => {

    await ctx.answerCbQuery();

    let result = getSignal(pair);

if (!result) {
    result = await analyzePair(pair);
    saveSignal(pair, result);
}

    return ctx.reply(
      `📊 تحليل ${pair}\n\n${formatSignal(result.signal)}`
    );

  });
});
bot.command('gold', async (ctx) => {

  let result = getSignal('XAUUSD');

  if (!result) {
      result = await analyzePair('XAUUSD');
      saveSignal('XAUUSD', result);
  }

  return ctx.reply(
      `تحليل الذهب XAUUSD\n${formatSignal(result.signal)}`
  );

});
  bot.hears('💎 VIP', (ctx) => ctx.reply(`اختر خطة VIP:\n\n${config.paymentInfo}`, vipKeyboard()));
  bot.hears('🔗 الإحالة', (ctx) => ctx.telegram.sendMessage(ctx.chat.id, '/ref'));
  const { Markup } = require('telegraf');

bot.hears('📈 تحليل زوج', (ctx) => {
  return ctx.reply(
    '📊 اختر الزوج الذي تريد تحليله:',
    Markup.inlineKeyboard([
      [Markup.button.callback('🇪🇺 EURUSD', 'pair_EURUSD')],
      [Markup.button.callback('🇬🇧 GBPUSD', 'pair_GBPUSD')],
      [Markup.button.callback('🇯🇵 USDJPY', 'pair_USDJPY')],
      [Markup.button.callback('🇦🇺 AUDUSD', 'pair_AUDUSD')],
      [Markup.button.callback('🇨🇦 USDCAD', 'pair_USDCAD')],
      [Markup.button.callback('🇨🇭 USDCHF', 'pair_USDCHF')],
      [Markup.button.callback('🇳🇿 NZDUSD', 'pair_NZDUSD')],
      [Markup.button.callback('🇪🇺🇯🇵 EURJPY', 'pair_EURJPY')],
      [Markup.button.callback('🇬🇧🇯🇵 GBPJPY', 'pair_GBPJPY')],
      [Markup.button.callback('🥇 XAUUSD', 'pair_XAUUSD')]
    ])
  );
});
  bot.hears('ℹ️ المساعدة', (ctx) => ctx.reply('الأوامر: /menu /vip /ref /analyze EURUSD'));
  bot.hears('👥 الجروب الرئيسي', (ctx) => {
  return ctx.reply(
    '🌐 الجروب الرئيسي:\nhttps://t.me/exiomexfx'
  );
});

bot.hears('🎧 الدعم', (ctx) => {
  return ctx.reply(
    '📩 الدعم الفني:\n@Axiomiexfx_support'
  );
});
  Object.entries(plans).forEach(([key, plan]) => {
    bot.action(`vip_${key}`, async (ctx) => {
      createVipRequest(ctx.from.id, key);
      await ctx.answerCbQuery();
      return ctx.reply(`تم تسجيل طلب خطة ${plan.label}. أرسل إثبات الدفع هنا وسيصل للأدمن.`);
    });
  });


bot.on(['photo', 'document'], async (ctx) => {

  console.log("📥 Payment proof received:", ctx.from.id);

  const fileId =
    ctx.message.photo?.at(-1)?.file_id ||
    ctx.message.document?.file_id;

  const caption = ctx.message.caption || "";

  createVipRequest(
    ctx.from.id,
    "manual",
    fileId,
    caption
  );

  const info = `📥 طلب اشتراك VIP جديد

👤 الاسم: ${ctx.from.first_name || ''}

🆔 ID: ${ctx.from.id}

👤 Username: @${ctx.from.username || 'لا يوجد'}

📝 ملاحظة:
${caption || 'لا يوجد'}`;

  for (const adminId of config.adminIds) {

    try {

      await ctx.telegram.sendMessage(adminId, info);

      await ctx.telegram.forwardMessage(
        adminId,
        ctx.chat.id,
        ctx.message.message_id
      );

    } catch (e) {
      console.log(`Forward to ${adminId} failed:`, e.message);
    }

  }

  return ctx.reply("✅ تم استلام إثبات الدفع وإرساله للإدارة.");

});
}

module.exports = registerUserCommands;
