const config = require('../config');

const {
  buildOpportunityRadar
} = require('./opportunityRadar');

const {
  getState,
  saveState
} = require('../database/opportunityTeaser');


function stateOf(row) {
  if (!row) {
    return 'WEAK';
  }

  if (
    row.ready ||
    row.passed >= row.total
  ) {
    return 'CONFIRMED';
  }

  if (row.passed === 5) {
    return 'ALMOST_READY';
  }

  if (row.passed === 4) {
    return 'FORMING';
  }

  return 'WEAK';
}


function directionText(direction) {
  if (direction === 'BUY') {
    return 'صعودي';
  }

  if (direction === 'SELL') {
    return 'هبوطي';
  }

  return 'غير محسوم';
}


async function runOpportunityTeaser(bot) {
  if (!config.mainGroupId) {
    return;
  }

  const rows =
    await buildOpportunityRadar();


  for (const row of rows) {

    const pair =
      String(row.pair)
        .toUpperCase();

    const currentState =
      stateOf(row);

    const direction =
      String(
        row.direction || ''
      ).toUpperCase();

    const previous =
      getState(pair);

    const previousState =
      String(
        previous?.last_state ||
        'NONE'
      );

    const previousDirection =
      String(
        previous?.last_direction ||
        ''
      ).toUpperCase();


    let effectiveState =
      currentState;


    /*
     * Opportunity cancellation:
     * it had reached 4/6 or 5/6,
     * then lost confirmation or reversed.
     */
    const wasDeveloping =
      previousState === 'FORMING' ||
      previousState === 'ALMOST_READY';

    const directionChanged =
      previousDirection &&
      direction &&
      previousDirection !== direction;

    if (
      wasDeveloping &&
      (
        currentState === 'WEAK' ||
        directionChanged
      )
    ) {
      effectiveState =
        'CANCELLED';
    }


    let message = null;


    // =========================================
    // 5 / 6 — PUBLIC TEASER
    // =========================================

    if (
      effectiveState === 'ALMOST_READY' &&
      previousState !== 'ALMOST_READY'
    ) {
      message =
`👀 فرصة قوية تتكوّن الآن
━━━━━━━━━━━━━━━━━━

🥇 ${pair}

🧭 الميل الحالي:
${directionText(direction)}

█████░ 5/6

⭐ AI Score:
${Number(row.score || 0).toFixed(0)}/100

⏳ باقي شرط واحد فقط قبل التأكيد الفني.

🔒 اتجاه التنفيذ النهائي
🔒 Entry
🔒 Stop Loss
🔒 TP1
🔒 TP2

متاحة عند اكتمال الفرصة لأعضاء VIP.

💎 /vip

⚠️ لا توجد إشارة دخول مؤكدة حتى الآن.`;
    }


    // =========================================
    // 6 / 6 — CONFIRMED
    // =========================================

    if (
      effectiveState === 'CONFIRMED' &&
      previousState !== 'CONFIRMED'
    ) {
      message =
`🔥 فرصة فنية اكتملت الآن
━━━━━━━━━━━━━━━━━━

🥇 ${pair}

██████ 6/6

⭐ AI Score:
${Number(row.score || 0).toFixed(0)}/100

✅ جميع شروط التأكيد الفني اكتملت.

💎 تم إتاحة تفاصيل التنفيذ لأعضاء VIP:

✓ اتجاه الصفقة
✓ Entry
✓ Stop Loss
✓ TP1
✓ TP2

🚀 /vip

⚠️ التحليل آلي ومعلوماتي ولا يضمن نتائج التداول.`;
    }


    // =========================================
    // CANCELLED
    // =========================================

    if (
      effectiveState === 'CANCELLED' &&
      previousState !== 'CANCELLED'
    ) {
      message =
`⚠️ الفرصة السابقة لم تكتمل
━━━━━━━━━━━━━━━━━━

🥇 ${pair}

📡 الرادار ألغى الفرصة قبل إصدار إشارة دخول مؤكدة.

${
  directionChanged
    ? '🔄 تغيّر اتجاه السوق قبل اكتمال التأكيد.'
    : '📉 فقدت الفرصة عددًا من شروط التأكيد.'
}

✅ لم يتم إصدار صفقة.

FOREX AI يستمر في مراقبة السوق تلقائيًا.`;
    }


    if (message) {
      try {
        await bot.telegram.sendMessage(
          config.mainGroupId,
          message
        );

        console.log(
          `📣 PUBLIC RADAR TEASER | ${pair} | ${effectiveState}`
        );

      } catch (error) {
        console.log(
          'Opportunity teaser send error:',
          error.message
        );
      }
    }


    saveState(
      pair,
      effectiveState,
      direction,
      row.score,
      Boolean(message)
    );
  }
}


module.exports = {
  runOpportunityTeaser
};
