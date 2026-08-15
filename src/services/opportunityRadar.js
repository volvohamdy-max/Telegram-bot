const { scanMarkets } = require('./smartScanner');
const { isPairMarketOpen } = require('../utils/marketHours');

const {
  getWatches,
  updateWatchState
} = require('../database/opportunityRadar');

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function clamp(v) {
  return Math.max(0, Math.min(100, Number(v || 0)));
}

function getDirection(row) {
  const d = String(
    row.action ||
    row.signal?.action ||
    row.technicalDirection ||
    row.direction ||
    'WAIT'
  ).toUpperCase();

  return ['BUY', 'SELL'].includes(d) ? d : 'WAIT';
}

function getScore(row) {
  return clamp(
    row.finalScore ??
    row.score ??
    row.smartScore ??
    row.scalpMeta?.score ??
    row.signal?.confidence ??
    0
  );
}

function evaluate(row) {
  const direction = getDirection(row);
  const i = row.indicators || row.analysis?.indicators || {};

  const ema20 = num(i.ema20);
  const ema50 = num(i.ema50);
  const rsi = num(i.rsi);
  const adx = num(i.adx);

  const macd = num(
    i.macd?.histogram ??
    i.macdHistogram
  );

  const score = getScore(row);

  const checks = [
    {
      label: 'اتجاه السوق',
      ok: direction !== 'WAIT'
    },
    {
      label: 'تأكيد EMA',
      ok:
        ema20 !== null &&
        ema50 !== null &&
        (
          (direction === 'BUY' && ema20 > ema50) ||
          (direction === 'SELL' && ema20 < ema50)
        )
    },
    {
      label: 'منطقة RSI',
      ok:
        rsi !== null &&
        (
          (direction === 'BUY' && rsi >= 50 && rsi <= 75) ||
          (direction === 'SELL' && rsi <= 50 && rsi >= 25)
        )
    },
    {
      label: 'زخم MACD',
      ok:
        macd !== null &&
        (
          (direction === 'BUY' && macd > 0) ||
          (direction === 'SELL' && macd < 0)
        )
    },
    {
      label: 'قوة ADX',
      ok: adx !== null && adx >= 20
    },
    {
      label: 'جودة الفرصة',
      ok: score >= 80
    }
  ];

  const passed = checks.filter(x => x.ok).length;

  return {
    checks,
    passed,
    total: checks.length,
    completion: Math.round((passed / checks.length) * 100)
  };
}

function normalize(row) {
  const pair = String(
    row.pair || row.symbol || ''
  ).toUpperCase();

  const result = evaluate(row);

  return {
    pair,
    direction: getDirection(row),
    score: getScore(row),
    passed: result.passed,
    total: result.total,
    completion: result.completion,
    missing: result.checks
      .filter(x => !x.ok)
      .map(x => x.label),
    ready: result.passed === result.total,

    entry:
      row.entry ??
      row.signal?.entry ??
      row.levels?.entry ??
      null,

    sl:
      row.stop_loss ??
      row.sl ??
      row.signal?.sl ??
      row.levels?.sl ??
      row.levels?.stop_loss ??
      null,

    tp1:
      row.target1 ??
      row.tp1 ??
      row.signal?.tp1 ??
      row.levels?.tp1 ??
      null,

    tp2:
      row.target2 ??
      row.tp2 ??
      row.signal?.tp2 ??
      row.levels?.tp2 ??
      null
  };
}

async function buildOpportunityRadar() {
  const rows = await scanMarkets();

  return (rows || [])
    .filter(row => {
      const pair = String(
        row.pair || row.symbol || ''
      ).toUpperCase();

      return pair && isPairMarketOpen(pair);
    })
    .map(normalize)
    .sort((a, b) => {
      if (b.passed !== a.passed)
        return b.passed - a.passed;

      return b.score - a.score;
    })
    .slice(0, 8);
}

function getState(row) {
  if (row.ready) return 'READY';
  if (row.passed >= 5) return 'ALMOST_READY';
  if (row.passed >= 4) return 'FORMING';
  return 'WEAK';
}

function radarText(rows) {
  if (!rows.length)
    return '📡 رادار الفرص\n\nلا توجد فرص نشطة حاليًا.';

  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];

  const body = rows.slice(0, 5).map((r, i) => {
    const direction =
      r.direction === 'BUY' ? '📈 BUY' :
      r.direction === 'SELL' ? '📉 SELL' :
      '⏳ WAIT';

    const bars =
      '█'.repeat(r.passed) +
      '░'.repeat(r.total - r.passed);

    let state = '⏳ تحت المراقبة';

    if (r.ready)
      state = '🔥 الفرصة مكتملة';
    else if (r.passed === 5)
      state = '👀 باقي شرط واحد';
    else if (r.passed >= 4)
      state = '🟡 الفرصة تتكوّن';

    const missing = r.missing[0]
      ? `الناقص: ${r.missing[0]}`
      : '✅ كل الشروط مؤكدة';

    return `${medals[i] || '•'} ${r.pair}
${direction}
${bars} ${r.passed}/${r.total}
⭐ Score: ${r.score}/100
${state}
${missing}`;
  }).join('\n\n');

  return `📡 FOREX AI — رادار الفرص
━━━━━━━━━━━━━━━━━━

${body}

━━━━━━━━━━━━━━━━━━
الرادار يراقب الفرص أثناء تكوّنها قبل اكتمال الإشارة.

⚠️ التحليل فني ومعلوماتي ولا يضمن نتائج التداول.`;
}

async function monitorOpportunityRadar(bot) {
  const watches = getWatches();
  if (!watches.length) return;

  const rows = await buildOpportunityRadar();
  const map = new Map(rows.map(r => [r.pair, r]));

  for (const watch of watches) {
    const pair = String(watch.pair).toUpperCase();

    if (!isPairMarketOpen(pair)) continue;

    const row = map.get(pair);
    if (!row) continue;

    const state = getState(row);
    const previous = String(watch.last_state || 'WATCHING');

    if (
      state !== previous &&
      (state === 'ALMOST_READY' || state === 'READY')
    ) {
      const text = state === 'READY'
        ? `🚨 فرصة الرادار اكتملت
━━━━━━━━━━━━━━━━━━
🥇 ${pair}
${row.direction === 'BUY' ? '📈 BUY' : '📉 SELL'}

✅ الشروط: ${row.passed}/${row.total}
⭐ Score: ${row.score}/100

🔥 جميع الشروط الفنية اكتملت.

افتح البوت لمراجعة التحليل قبل اتخاذ القرار.

⚠️ التحليل آلي ولا يضمن نتائج التداول.`

        : `👀 فرصة تقترب من الاكتمال
━━━━━━━━━━━━━━━━━━
🥇 ${pair}
${row.direction === 'BUY' ? '📈 BUY' : '📉 SELL'}

✅ الشروط: ${row.passed}/${row.total}
⭐ Score: ${row.score}/100

⏳ باقي شرط واحد:
${row.missing[0] || '—'}

📡 الرادار مستمر في المتابعة.`;

      try {
        await bot.telegram.sendMessage(
          watch.telegram_id,
          text
        );
      } catch (e) {
        console.log(
          'Radar alert send failed:',
          e.message
        );
      }
    }

    updateWatchState(
      watch.telegram_id,
      pair,
      state,
      row.score
    );
  }
}

module.exports = {
  buildOpportunityRadar,
  radarText,
  monitorOpportunityRadar
};
