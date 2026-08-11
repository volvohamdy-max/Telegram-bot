const { Markup } = require('telegraf');
const { tByLang } = require('../utils/i18n');

const mainKeyboard = (language = 'ar') => {
  const { buttons } = tByLang(language);

  return Markup.keyboard([
    [buttons.tradeNow, buttons.bestOpportunity],
    [buttons.marketCenter, buttons.alertsCenter],
    [buttons.accountCenter, buttons.more]
  ]).resize();
};

const marketKeyboard = (language = 'ar') => {
  const { buttons } = tByLang(language);

  return Markup.keyboard([
    [buttons.scanner, buttons.marketMap],
    [buttons.trendHunter, buttons.analysis],
    [buttons.signalLab],
    [buttons.back]
  ]).resize();
};

const alertsKeyboard = (language = 'ar') => {
  const { buttons } = tByLang(language);

  return Markup.keyboard([
    [buttons.alerts],
    [buttons.back]
  ]).resize();
};

const accountKeyboard = (language = 'ar') => {
  const { buttons } = tByLang(language);

  return Markup.keyboard([
    [buttons.account, buttons.vip],
    [buttons.referral, buttons.language],
    [buttons.back]
  ]).resize();
};

const moreKeyboard = (language = 'ar') => {
  const { buttons } = tByLang(language);

  return Markup.keyboard([
    [buttons.support, buttons.settings],
    [buttons.back]
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
  marketKeyboard,
  alertsKeyboard,
  accountKeyboard,
  moreKeyboard,
  settingsKeyboard,
  vipKeyboard
};
