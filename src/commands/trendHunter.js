const { findUser } = require('../database/users');
const { mainKeyboard } = require('../keyboards/main');
const { scanTrends } = require('../services/trendHunter');

function lang(ctx) {
  const user = findUser(ctx.from.id);
  return user && user.language === 'en' ? 'en' : 'ar';
}
function p(v) { const n = Number(v); return Number.isFinite(n) ? n.toFixed(5) : '—'; }
function d(x) { return x === 'BUY' ? '🟢 BUY' : x === 'SELL' ? '🔴 SELL' : '⚪ WAIT'; }
function s(x,en) {
  const m = {
    ENTRY_READY: en ? '🔥 ENTRY READY' : '🔥 دخول جاهز',
    WAIT_PULLBACK: en ? '🟡 WAIT PULLBACK' : '🟡 انتظر تصحيح',
    TREND_FOUND: en ? '📈 TREND FOUND' : '📈 ترند واضح',
    NO_TREND: en ? '⚪ NO TREND' : '⚪ لا يوجد ترند',
    NO_DATA: en ? '⚪ NO DATA' : '⚪ لا توجد بيانات',
    ERROR: en ? '⚪ ERROR' : '⚪ خطأ'
  };
  return m[x] || x;
}

function report(results,en) {
  const summary = results.map((x,i)=>`${i+1}. ${x.pair} | ${d(x.direction)}\n${s(x.status,en)} | ⭐ ${x.score}/100`).join('\n\n');
  const ready = results.filter(x=>x.status==='ENTRY_READY');
  const details = ready.map(x=>{
    const l=x.levels||{};
    return en
      ? `🔥 ${x.pair} — ${x.direction}\n⭐ Trend Score: ${x.score}/100\n🤖 AI Confidence: ${x.aiConfidence}%\n💪 ADX: ${Number.isFinite(x.adx)?x.adx.toFixed(1):'—'}\n📊 RSI: ${Number.isFinite(x.rsi)?x.rsi.toFixed(1):'—'}\n\n💰 Entry: ${p(l.entry)}\n🛑 SL: ${p(l.sl)}\n🎯 TP1: ${p(l.tp1)}\n🏆 TP2: ${p(l.tp2)}\n⚖️ R:R → 1:1 / 1:2`
      : `🔥 ${x.pair} — ${x.direction}\n⭐ قوة الترند: ${x.score}/100\n🤖 ثقة AI: ${x.aiConfidence}%\n💪 ADX: ${Number.isFinite(x.adx)?x.adx.toFixed(1):'—'}\n📊 RSI: ${Number.isFinite(x.rsi)?x.rsi.toFixed(1):'—'}\n\n💰 الدخول: ${p(l.entry)}\n🛑 وقف الخسارة: ${p(l.sl)}\n🎯 TP1: ${p(l.tp1)}\n🏆 TP2: ${p(l.tp2)}\n⚖️ العائد للمخاطرة → 1:1 / 1:2`;
  }).join('\n\n━━━━━━━━━━━━━━━━━━\n\n');

  return en
    ? `📡 TREND HUNTER\n━━━━━━━━━━━━━━━━━━\n\n${summary}\n\n━━━━━━━━━━━━━━━━━━\n${ready.length?`🎯 ENTRY-READY OPPORTUNITIES\n\n${details}`:'🔍 No entry-ready setup right now.'}\n\n⚠️ Entry Ready means the bot conditions aligned; it is not a guarantee of profit.`
    : `📡 صياد الترند\n━━━━━━━━━━━━━━━━━━\n\n${summary}\n\n━━━━━━━━━━━━━━━━━━\n${ready.length?`🎯 فرص جاهزة للدخول\n\n${details}`:'🔍 لا توجد فرصة جاهزة للدخول حاليًا.'}\n\n⚠️ دخول جاهز يعني توافق شروط البوت، وليس ضمانًا للربح.`;
}

function registerTrendHunter(bot) {
  bot.hears(['📡 صياد الترند','📡 Trend Hunter'], async (ctx)=>{
    const en = lang(ctx)==='en';
    await ctx.reply(en
      ? '📡 TREND HUNTER\n\n🔍 Scanning 8 markets...\n📈 EMA + 💪 ADX + 📊 RSI + 📉 MACD + 🤖 AI\n\n⏳ One moment...'
      : '📡 صياد الترند\n\n🔍 جاري فحص الـ 8 أسواق...\n📈 EMA + 💪 ADX + 📊 RSI + 📉 MACD + 🤖 AI\n\n⏳ لحظات...');
    try {
      const results = await scanTrends();
      return ctx.reply(report(results,en), mainKeyboard(en?'en':'ar'));
    } catch (error) {
      console.log('❌ Trend Hunter command error:', error.stack || error);
      return ctx.reply(en?'❌ Trend Hunter failed. Try again shortly.':'❌ تعذر إكمال فحص صياد الترند. حاول مرة أخرى بعد قليل.', mainKeyboard(en?'en':'ar'));
    }
  });
}
module.exports = registerTrendHunter;
