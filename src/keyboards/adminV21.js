const { Markup } = require('telegraf');

function adminV21Keyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📊 Dashboard', 'adminv21_dashboard'),
      Markup.button.callback('📈 الصفقات الحية', 'adminv21_live')
    ],
    [
      Markup.button.callback('📉 الأداء', 'adminv21_performance'),
      Markup.button.callback('🧠 قرارات الإشارات', 'adminv21_decisions')
    ],
    [
      Markup.button.callback('👥 المستخدمون / VIP', 'adminv21_users'),
      Markup.button.callback('📰 الأخبار', 'adminv21_news')
    ],
    [
      Markup.button.callback('🎛️ التحكم', 'adminv21_controls'),
      Markup.button.callback('🩺 System Health', 'adminv21_health')
    ],
    [
      Markup.button.callback('🔄 تحديث', 'adminv21_dashboard'),
      Markup.button.callback('⬅️ خروج', 'adminv21_exit')
    ]
  ]);
}

function controlsV21Keyboard(settings = {}) {
  const auto = settings.auto_signals_enabled === '1';
  const breaking = settings.breaking_news_enabled === '1';
  const maintenance = settings.maintenance_mode === '1';

  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        `${auto ? '🟢' : '🔴'} Auto Signals`,
        'adminv21_toggle_auto'
      ),
      Markup.button.callback(
        `${breaking ? '🟢' : '🔴'} Breaking News`,
        'adminv21_toggle_breaking'
      )
    ],
    [
      Markup.button.callback('➖ AI', 'adminv21_ai_down'),
      Markup.button.callback(
        `🤖 ${settings.min_ai_confidence || '60'}%`,
        'adminv21_controls'
      ),
      Markup.button.callback('➕ AI', 'adminv21_ai_up')
    ],
    [
      Markup.button.callback('➖ Risk', 'adminv21_risk_down'),
      Markup.button.callback(
        `🥇 ${settings.gold_max_risk_pct || '0.35'}%`,
        'adminv21_controls'
      ),
      Markup.button.callback('➕ Risk', 'adminv21_risk_up')
    ],
    [
      Markup.button.callback(
        `${maintenance ? '🟠' : '⚪'} Maintenance`,
        'adminv21_maintenance'
      )
    ],
    [
      Markup.button.callback('⬅️ Dashboard', 'adminv21_dashboard')
    ]
  ]);
}

function maintenanceConfirmKeyboard(active) {
  if (active) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(
          '🟢 إعادة فتح البوت',
          'adminv21_maintenance_disable'
        )
      ],
      [
        Markup.button.callback('❌ إلغاء', 'adminv21_cancel')
      ]
    ]);
  }

  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        '🟠 نعم، فعّل الصيانة',
        'adminv21_maintenance_enable'
      )
    ],
    [
      Markup.button.callback('❌ إلغاء', 'adminv21_cancel')
    ]
  ]);
}

module.exports = {
  adminV21Keyboard,
  controlsV21Keyboard,
  maintenanceConfirmKeyboard
};
