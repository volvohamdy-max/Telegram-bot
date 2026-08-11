const { Markup } = require('telegraf');
const { tByLang } = require('../utils/i18n');

const mainKeyboard = (language = 'ar') => {
  const { buttons } = tByLang(language);

  return Markup.keyboard([
    [buttons.tradeNow, buttons.scanner],
    [buttons.analysis, buttons.signalLab],
    [buttons.vip, buttons.account],
    [buttons.referral, buttons.alerts],
    [buttons.support, buttons.settings]
  ]).resize();
};

const settingsKeyboard = (language = 'ar') => {
  const { buttons } = tByLang(language);

  return Markup.keyboard([
    [buttons.language],
    [buttons.back]
  ]).resize();
};

const vipKeyboard = () =>
  Markup.inlineKeyboard([
    [Markup.button.callback('Monthly - 30 days / شهري', 'vip_monthly')],
    [Markup.button.callback('Quarterly - 90 days / ثلاثي', 'vip_quarterly')],
    [Markup.button.callback('Yearly - 365 days / سنوي', 'vip_yearly')]
  ]);

module.exports = {
  mainKeyboard,
  settingsKeyboard,
  vipKeyboard
};
