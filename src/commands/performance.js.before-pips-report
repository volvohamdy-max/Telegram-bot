const { getStats } = require('../database/performance');
const { findUser } = require('../database/users');

function isEnglish(ctx) {
  return findUser(ctx.from.id)?.language === 'en';
}

function pct(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function rText(value) {
  return Number.isFinite(Number(value))
    ? Number(value).toFixed(2)
    : 'N/A';
}

function formatStats(stats, en) {
  if (!stats.total) {
    return en
      ? `📊 PERFORMANCE — ${stats.days} DAYS

No tracked trades yet.

The tracker starts collecting verified results from this version onward.`
      : `📊 أداء البوت — آخر ${stats.days} يوم

لا توجد صفقات مسجلة في التتبع حتى الآن.

سيبدأ النظام في تجميع النتائج الموثقة من هذه النسخة فصاعدًا.`;
  }

  const pairRows = Object.entries(stats.byPair)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([pair, s]) => {
      if (!s.closed) {
        return `${pair}: ${s.total} ${en ? 'tracked' : 'متابعة'}`;
      }

      return `${pair}: ${s.closed} ${en ? 'closed' : 'مغلقة'} | TP1 ${s.tp1} | TP2 ${s.tp2} | SL ${s.sl} | TP1→SL ${s.tp1ThenSl || 0}`;
    })
    .join('\n');

  if (en) {
    return `📊 BOT PERFORMANCE — ${stats.days} DAYS
━━━━━━━━━━━━━━━━━━

📌 Tracked trades: ${stats.total}
🟢 Open: ${stats.open}
✅ Closed: ${stats.closed}

🎯 TP1 hit: ${stats.tp1} (${pct(stats.tp1Rate)})
🏆 TP2 hit: ${stats.tp2} (${pct(stats.tp2Rate)})
🛑 Pure SL: ${stats.sl} (${pct(stats.slRate)})
🟡 TP1 then SL: ${stats.tp1ThenSl || 0}

⚖️ Average final R: ${rText(stats.avgR)}
📈 Total final R: ${rText(stats.totalR)}

By asset:
${pairRows || '—'}

ℹ️ TP1→SL is tracked separately and is not counted as a full-loss SL.`;
  }

  return `📊 أداء البوت — آخر ${stats.days} يوم
━━━━━━━━━━━━━━━━━━

📌 الصفقات المتابعة: ${stats.total}
🟢 مفتوحة: ${stats.open}
✅ مغلقة: ${stats.closed}

🎯 حققت TP1: ${stats.tp1} (${pct(stats.tp1Rate)})
🏆 حققت TP2: ${stats.tp2} (${pct(stats.tp2Rate)})
🛑 SL قبل TP1: ${stats.sl} (${pct(stats.slRate)})
🟡 TP1 ثم SL: ${stats.tp1ThenSl || 0}

⚖️ متوسط R النهائي: ${rText(stats.avgR)}
📈 إجمالي R النهائي: ${rText(stats.totalR)}

حسب الأصل:
${pairRows || '—'}

ℹ️ حالة TP1 ثم SL تُسجل منفصلة ولا تُحسب كخسارة SL كاملة.`;
}

function registerPerformance(bot) {
  bot.command('performance', async (ctx) => {
    try {
      const en = isEnglish(ctx);
      const s7 = getStats(7);
      const s30 = getStats(30);

      await ctx.reply(formatStats(s7, en));
      return ctx.reply(formatStats(s30, en));
    } catch (error) {
      console.log('/performance error:', error.message);

      return ctx.reply(
        isEnglish(ctx)
          ? '❌ Performance statistics are temporarily unavailable.'
          : '❌ إحصائيات الأداء غير متاحة مؤقتًا.'
      );
    }
  });
}

module.exports = registerPerformance;
