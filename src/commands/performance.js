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

      return `${pair}: ${s.closed} ${en ? 'closed' : 'مغلقة'} | TP1 ${s.tp1} | TP2 ${s.tp2} | SL ${s.sl}`;
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
🛑 SL hit: ${stats.sl} (${pct(stats.slRate)})

⚖️ Average final R: ${rText(stats.avgR)}
📈 Total final R: ${rText(stats.totalR)}

By asset:
${pairRows || '—'}

⚠️ TP1 and SL can both be counted if a trade hit TP1 first and later returned to SL.`;
  }

  return `📊 أداء البوت — آخر ${stats.days} يوم
━━━━━━━━━━━━━━━━━━

📌 الصفقات المتابعة: ${stats.total}
🟢 مفتوحة: ${stats.open}
✅ مغلقة: ${stats.closed}

🎯 حققت TP1: ${stats.tp1} (${pct(stats.tp1Rate)})
🏆 حققت TP2: ${stats.tp2} (${pct(stats.tp2Rate)})
🛑 ضربت SL: ${stats.sl} (${pct(stats.slRate)})

⚖️ متوسط R النهائي: ${rText(stats.avgR)}
📈 إجمالي R النهائي: ${rText(stats.totalR)}

حسب الأصل:
${pairRows || '—'}

⚠️ يمكن أن تُحسب الصفقة ضمن TP1 وSL معًا إذا حققت الهدف الأول ثم عادت إلى وقف الخسارة.`;
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
