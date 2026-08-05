const config = require('../config');
const { createOrUpdateUser, checkReferralReward } = require('../database/users');
const { mainKeyboard } = require('../keyboards/main');
const { requireAdmin } = require('../utils/auth');
const adminKeyboard = require('../keyboards/admin');
function registerStart(bot) {
  bot.command('start', async (ctx) => {

    const user = createOrUpdateUser(ctx.from, ctx.startPayload);
if(requireAdmin(ctx, true)){

    return ctx.reply(
        '👑 لوحة تحكم الأدمن',
        adminKeyboard()
    );

}
const vipReward = checkReferralReward(ctx.from.id);

if (vipReward) {
    await ctx.reply(`
🎉 مبروك!

لقد جمعت 200 نقطة من نظام الإحالات.

💎 تم تفعيل اشتراك VIP لمدة 14 يومًا مجانًا.

استمتع بالإشارات الاحترافية 🚀
`);
}
    const refLink =
      `https://t.me/${config.botUsername}?start=${user.referral_code}`;

    return ctx.reply(
`🤖 أهلاً بك ${user.first_name || ''}

مرحباً بك في Forex AI Bot 🚀

✅ تحليل احترافي لـ 10 أزواج فوركس.
🥇 تحليل الذهب XAUUSD.
📈 إشارات تلقائية عند ظهور فرص قوية.
🎯 تحليل بالذكاء الاصطناعي مع نسبة ثقة.

━━━━━━━━━━━━━━

🔗 رابط إحالتك:

${refLink}

━━━━━━━━━━━━━━

اختر الخدمة التي تريدها من القائمة بالأسفل 👇`,
      mainKeyboard()
    );

  });
}

module.exports = registerStart;
