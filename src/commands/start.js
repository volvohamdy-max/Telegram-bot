const config = require('../config');
const { createOrUpdateUser } = require('../database/users');
const { mainKeyboard } = require('../keyboards/main');

function registerStart(bot) {
  bot.start((ctx) => {
    const user = createOrUpdateUser(ctx.from, ctx.startPayload);
    const refLink = `https://t.me/${config.botUsername}?start=${user.referral_code}`;
    return ctx.reply(`أهلا ${user.first_name || ''}\nتم تسجيلك بنجاح.\nرابط إحالتك:\n${refLink}`, mainKeyboard());
  });
}

module.exports = registerStart;
