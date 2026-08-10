const config = require('../config');
const { findUser } = require('../database/users');
const { vipKeyboard, mainKeyboard } = require('../keyboards/main');
const { plans, createVipRequest } = require('../services/vipService');
const { analyzePair } = require('../services/analysisService');
const { scanMarkets } = require('../services/smartScanner');
const { Markup } = require('telegraf');
const { runSignalLab } = require('../services/signalLab');
const { getBestTrade } = require('../services/bestTrade');

const PAIRS = [
  'XAUUSD',
  'BTCUSD',
  'EURUSD',
  'GBPUSD',
  'USDJPY',
  'EURJPY',
  'GBPJPY',
  'CHFJPY'
];

const ASSET_ROWS = [
  ['🥇 XAUUSD', '₿ BTCUSD'],
  ['🇪🇺 EURUSD', '🇬🇧 GBPUSD'],
  ['🇯🇵 USDJPY', '🇪🇺 EURJPY'],
  ['🇬🇧 GBPJPY', '🇨🇭 CHFJPY']
];

const ASSET_MAP = {
  '🥇 XAUUSD': 'XAUUSD',
  '₿ BTCUSD': 'BTCUSD',
  '🇪🇺 EURUSD': 'EURUSD',
  '🇬🇧 GBPUSD': 'GBPUSD',
  '🇯🇵 USDJPY': 'USDJPY',
  '🇪🇺 EURJPY': 'EURJPY',
  '🇬🇧 GBPJPY': 'GBPJPY',
  '🇨🇭 CHFJPY': 'CHFJPY'
};

function languageOf(ctx) {
  const user = findUser(ctx.from.id);
  return user && user.language === 'en' ? 'en' : 'ar';
}

function isEnglish(ctx) {
  return languageOf(ctx) === 'en';
}

function keyboard(ctx) {
  return mainKeyboard(languageOf(ctx));
}

function assetKeyboard(ctx) {
  const back = isEnglish(ctx) ? '🔙 Back' : '🔙 رجوع';
  return Markup.keyboard([...ASSET_ROWS, [back]]).resize();
}

function formatPrice(value, language = 'ar') {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return language === 'en' ? 'N/A' : 'غير متاح';
  }
  return number.toFixed(5);
}

function accountText(ctx, user) {
  const en = isEnglish(ctx);
  const expiry = user.vip_expires_at || user.vip_expire;

  if (en) {
    return `👤 MY ACCOUNT

🆔 ID
${ctx.from.id}

💎 VIP
${user.is_vip ? '✅ Active' : '❌ Inactive'}

🎁 Points
${user.points || 0}

📅 VIP expiry
${expiry || 'Not subscribed'}

🔗 Referral code
${user.referral_code || '-'}`;
  }

  return `👤 حسابي

🆔 ID
${ctx.from.id}

💎 اشتراك VIP
${user.is_vip ? '✅ مفعل' : '❌ غير مفعل'}

🎁 النقاط
${user.points || 0}

📅 انتهاء الاشتراك
${expiry || 'غير مشترك'}

🔗 كود الإحالة
${user.referral_code || '-'}`;
}

function scannerResultText(ctx, results) {
  const en = isEnglish(ctx);
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

  const rows = results.slice(0, 5).map((item, index) => {
    const directionEmoji =
      item.action === 'BUY' ? '🟢' :
      item.action === 'SELL' ? '🔴' : '🟡';

    return `${medals[index]} ${item.pair}  ${directionEmoji} ${item.action}
⭐ ${en ? 'Score' : 'التقييم'}: ${item.score}/100`;
  });

  if (en) {
    return `🔎 SMART MARKET SCANNER
━━━━━━━━━━━━━━━━━━

${rows.join('\n\n')}

━━━━━━━━━━━━━━━━━━
📊 ${results.length} market opportunities ranked
⏱️ Updated: now

⚠️ Market analysis is informational and does not guarantee profit.`;
  }

  return `🔎 الماسح الذكي للسوق
━━━━━━━━━━━━━━━━━━

${rows.join('\n\n')}

━━━━━━━━━━━━━━━━━━
📊 تم ترتيب ${results.length} فرص حسب القوة
⏱️ آخر تحديث: الآن

⚠️ التحليل يعكس حالة السوق الحالية ولا يضمن الربح.`;
}

function trendPowerText(adx, en) {
  if (adx >= 35) return en ? '⭐⭐⭐⭐⭐ Very strong' : '⭐⭐⭐⭐⭐ قوي جدًا';
  if (adx >= 25) return en ? '⭐⭐⭐⭐☆ Strong' : '⭐⭐⭐⭐☆ قوي';
  if (adx >= 20) return en ? '⭐⭐⭐☆☆ Moderate' : '⭐⭐⭐☆☆ متوسط';
  return en ? '⭐⭐☆☆☆ Weak' : '⭐⭐☆☆☆ ضعيف';
}

function marketAnalysisText(ctx, pair, result) {
  const en = isEnglish(ctx);
  const indicators = result.indicators;
  const bullish = Number(indicators.ema20) > Number(indicators.ema50);
  const macdBullish =
    Number(indicators.macd?.macd) > Number(indicators.macd?.signal);
  const adx = Number(indicators.adx);
  const rsi = Number(indicators.rsi);
  const price = Number(indicators.lastPrice);

  const trendScore = bullish ? 9 : 4;
  const momentumScore = rsi > 55 && rsi < 70 ? 8 : 6;
  const buyersScore = macdBullish ? 9 : 4;
  const liquidityScore = adx > 25 ? 8 : 6;
  const finalScore = Math.round(
    ((trendScore + momentumScore + buyersScore + liquidityScore) / 4) * 10
  );

  // AI output may come from an external model in its own language.
  // Keep it as-is when present; otherwise use our localized fallback.
  const aiComment = result.signal?.analysis || (
    en
      ? `Technical indicators currently suggest ${bullish ? 'buyer' : 'seller'} control on ${pair}.`
      : `تشير المؤشرات الفنية حاليًا إلى سيطرة ${bullish ? 'المشترين' : 'البائعين'} على حركة ${pair}.`
  );

  if (en) {
    return `📊 MARKET ANALYSIS

💱 Asset: ${pair}
💰 Current price: ${formatPrice(price, 'en')}

━━━━━━━━━━━━━━━━━━
📈 Main trend: ${bullish ? '🟢 Bullish' : '🔴 Bearish'}
📊 Trend strength: ${trendPowerText(adx, true)}

━━━━━━━━━━━━━━━━━━
📉 INDICATORS

EMA20: ${bullish ? '🟢 Above EMA50' : '🔴 Below EMA50'}
RSI: ${Number.isFinite(rsi) ? rsi.toFixed(1) : 'N/A'} ${rsi >= 50 ? '🟢 Positive momentum' : '🔴 Negative momentum'}
MACD: ${macdBullish ? '🟢 Bullish crossover' : '🔴 Bearish crossover'}
ADX: ${Number.isFinite(adx) ? adx.toFixed(1) : 'N/A'} ${adx >= 25 ? '🟢 Strong trend' : '🟡 Weak trend'}

━━━━━━━━━━━━━━━━━━
📍 KEY LEVELS

🟢 Support: ${indicators.support ?? 'N/A'}
🔴 Resistance: ${indicators.resistance ?? 'N/A'}

━━━━━━━━━━━━━━━━━━
🤖 AI ANALYSIS

${aiComment}

━━━━━━━━━━━━━━━━━━
📌 MARKET SCORE

Trend: ${trendScore}/10
Momentum: ${momentumScore}/10
Liquidity: ${liquidityScore}/10
Buyer strength: ${buyersScore}/10

⭐ Final score: ${finalScore >= 70 ? '🟢' : '🟡'} ${finalScore}/100

⚠️ This report describes current market conditions and is not a direct entry signal.`;
  }

  return `📊 تحليل السوق

💱 الأصل: ${pair}
💰 السعر الحالي: ${formatPrice(price, 'ar')}

━━━━━━━━━━━━━━━━━━
📈 الاتجاه العام: ${bullish ? '🟢 صاعد' : '🔴 هابط'}
📊 قوة الاتجاه: ${trendPowerText(adx, false)}

━━━━━━━━━━━━━━━━━━
📉 قراءة المؤشرات

EMA20: ${bullish ? '🟢 أعلى من EMA50' : '🔴 أقل من EMA50'}
RSI: ${Number.isFinite(rsi) ? rsi.toFixed(1) : 'غير متاح'} ${rsi >= 50 ? '🟢 زخم إيجابي' : '🔴 زخم سلبي'}
MACD: ${macdBullish ? '🟢 تقاطع شرائي' : '🔴 تقاطع بيعي'}
ADX: ${Number.isFinite(adx) ? adx.toFixed(1) : 'غير متاح'} ${adx >= 25 ? '🟢 ترند قوي' : '🟡 ترند ضعيف'}

━━━━━━━━━━━━━━━━━━
📍 أهم المستويات

🟢 الدعم: ${indicators.support ?? 'غير متاح'}
🔴 المقاومة: ${indicators.resistance ?? 'غير متاح'}

━━━━━━━━━━━━━━━━━━
🤖 تحليل الذكاء الاصطناعي

${aiComment}

━━━━━━━━━━━━━━━━━━
📌 تقييم السوق

الاتجاه: ${trendScore}/10
الزخم: ${momentumScore}/10
السيولة: ${liquidityScore}/10
قوة المشترين: ${buyersScore}/10

⭐ التقييم النهائي: ${finalScore >= 70 ? '🟢' : '🟡'} ${finalScore}/100

⚠️ التقرير يوضح حالة السوق الحالية وليس إشارة دخول مباشرة.`;
}

function tradeText(ctx, trade) {
  const en = isEnglish(ctx);
  const indicators = trade.indicators || {};
  const lastPrice = Number(indicators.lastPrice);

  // Sprint 2 intentionally keeps the existing trade-level logic unchanged.
  const entry = Number.isFinite(lastPrice) ? lastPrice : null;
  const atr = Number(indicators.atr);
  let tp1 = null;
  let tp2 = null;
  let sl = null;

  if (Number.isFinite(entry) && Number.isFinite(atr) && atr > 0) {
    if (trade.action === 'BUY') {
      tp1 = entry + atr;
      tp2 = entry + atr * 1.8;
      sl = entry - atr;
    } else {
      tp1 = entry - atr;
      tp2 = entry - atr * 1.8;
      sl = entry + atr;
    }
  }

  const action = trade.action === 'BUY' ? '🟢 BUY' : '🔴 SELL';
  const strength = trade.finalScore >= 85
    ? (en ? '🔥 Very strong' : '🔥 قوية جدًا')
    : trade.finalScore >= 75
      ? (en ? '💪 Strong' : '💪 قوية')
      : (en ? '🟡 Moderate' : '🟡 متوسطة');

  const lang = en ? 'en' : 'ar';

  if (en) {
    return `⚡ TRADE NOW

🎯 ${trade.pair}  ${action}

━━━━━━━━━━━━━━━━━━
📊 QUALITY

⭐ Smart Score: ${trade.smartScore}/100
🤖 AI Confidence: ${trade.confidence}%
🧪 Historical Score: ${trade.historicalScore}/100
📚 Similar Setups: ${trade.similarSetups}

🎯 TP1 Success: ${trade.tp1Rate}%
🏆 TP2 Success: ${trade.tp2Rate}%
🛑 SL Rate: ${trade.slRate}%

━━━━━━━━━━━━━━━━━━
💰 Entry: ${formatPrice(entry, lang)}
🎯 TP1: ${formatPrice(tp1, lang)}
🏆 TP2: ${formatPrice(tp2, lang)}
🛑 Stop Loss: ${formatPrice(sl, lang)}

━━━━━━━━━━━━━━━━━━
🔥 Trade strength: ${strength}
📊 RSI: ${Number.isFinite(Number(indicators.rsi)) ? Number(indicators.rsi).toFixed(1) : 'N/A'}
💪 ADX: ${Number.isFinite(Number(indicators.adx)) ? Number(indicators.adx).toFixed(1) : 'N/A'}

⚠️ Scores are analytical metrics, not a guarantee of profit.`;
  }

  return `⚡ صفقة الآن

🎯 ${trade.pair}  ${action}

━━━━━━━━━━━━━━━━━━
📊 جودة الفرصة

⭐ Smart Score: ${trade.smartScore}/100
🤖 AI Confidence: ${trade.confidence}%
🧪 Historical Score: ${trade.historicalScore}/100
📚 الحالات المشابهة: ${trade.similarSetups}

🎯 نجاح TP1: ${trade.tp1Rate}%
🏆 نجاح TP2: ${trade.tp2Rate}%
🛑 معدل SL: ${trade.slRate}%

━━━━━━━━━━━━━━━━━━
💰 الدخول: ${formatPrice(entry, lang)}
🎯 TP1: ${formatPrice(tp1, lang)}
🏆 TP2: ${formatPrice(tp2, lang)}
🛑 وقف الخسارة: ${formatPrice(sl, lang)}

━━━━━━━━━━━━━━━━━━
🔥 قوة الصفقة: ${strength}
📊 RSI: ${Number.isFinite(Number(indicators.rsi)) ? Number(indicators.rsi).toFixed(1) : 'غير متاح'}
💪 ADX: ${Number.isFinite(Number(indicators.adx)) ? Number(indicators.adx).toFixed(1) : 'غير متاح'}

⚠️ التقييمات مؤشرات تحليلية وليست ضمانًا للربح.`;
}

async function calculateSignalLab() {
  const results = [];

  for (const pair of PAIRS) {
    try {
      const analysis = await analyzePair(pair);
      if (!analysis || !analysis.indicators) continue;

      const indicators = analysis.indicators;
      const ema20 = Number(indicators.ema20);
      const ema50 = Number(indicators.ema50);
      const rsi = Number(indicators.rsi);
      const adx = Number(indicators.adx);
      let buyScore = 0;
      let sellScore = 0;

      if (Number.isFinite(ema20) && Number.isFinite(ema50)) {
        if (ema20 > ema50) buyScore++;
        else if (ema20 < ema50) sellScore++;
      }

      if (Number.isFinite(rsi)) {
        if (rsi > 50) buyScore++;
        else if (rsi < 50) sellScore++;
      }

      if (
        indicators.macd &&
        Number.isFinite(Number(indicators.macd.macd)) &&
        Number.isFinite(Number(indicators.macd.signal))
      ) {
        if (Number(indicators.macd.macd) > Number(indicators.macd.signal)) buyScore++;
        else if (Number(indicators.macd.macd) < Number(indicators.macd.signal)) sellScore++;
      }

      if (Number.isFinite(adx) && adx >= 20) {
        if (buyScore > sellScore) buyScore++;
        else if (sellScore > buyScore) sellScore++;
      }

      let direction = 'WAIT';
      if (buyScore > sellScore && buyScore >= 2) direction = 'BUY';
      else if (sellScore > buyScore && sellScore >= 2) direction = 'SELL';

      const smartScore = Math.round((Math.max(buyScore, sellScore) / 4) * 100);

      let lab = {
        approved: false,
        historicalScore: 0,
        similarSetups: 0,
        tp1Rate: 0,
        tp2Rate: 0,
        slRate: 0
      };

      if (direction !== 'WAIT') {
        try {
          const labResult = await runSignalLab(pair, indicators, direction);
          if (labResult) {
            lab = {
              approved: Boolean(labResult.approved),
              historicalScore: Number(labResult.historicalScore) || 0,
              similarSetups: Number(labResult.similarSetups) || 0,
              tp1Rate: Number(labResult.tp1Rate) || 0,
              tp2Rate: Number(labResult.tp2Rate) || 0,
              slRate: Number(labResult.slRate) || 0
            };
          }
        } catch (error) {
          console.log(`❌ Lab calculation ${pair}:`, error.message);
        }
      }

      results.push({
        pair,
        direction,
        smartScore,
        ...lab
      });
    } catch (error) {
      console.log(`❌ Signal Lab ${pair} error:`, error.message);
    }
  }

  return results.sort((a, b) => b.smartScore - a.smartScore);
}

function signalLabText(ctx, results) {
  const en = isEnglish(ctx);
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

  const messages = results.slice(0, 5).map((item, index) => {
    const direction =
      item.direction === 'BUY' ? '🟢 BUY' :
      item.direction === 'SELL' ? '🔴 SELL' : '⚪ WAIT';

    const status = item.approved
      ? (en ? '✅ LAB APPROVED' : '✅ مقبول من المختبر')
      : (en ? '⚠️ LAB NOT APPROVED' : '⚠️ غير معتمد من المختبر');

    return `${medals[index]} ${item.pair}  ${direction}
⭐ Smart Score: ${item.smartScore}/100
🧪 Historical Score: ${item.historicalScore}/100
📚 ${en ? 'Similar Setups' : 'الحالات المشابهة'}: ${item.similarSetups}
🎯 TP1: ${item.tp1Rate}%
🏆 TP2: ${item.tp2Rate}%
🛑 SL: ${item.slRate}%
${status}`;
  });

  return en
    ? `🧪 AI SIGNAL LAB

${messages.join('\n━━━━━━━━━━━━━━━━━━\n\n')}

━━━━━━━━━━━━━━━━━━
📌 Historical similarity is an analytical reference, not a promise of future results.`
    : `🧪 مختبر إشارات الذكاء الاصطناعي

${messages.join('\n━━━━━━━━━━━━━━━━━━\n\n')}

━━━━━━━━━━━━━━━━━━
📌 التشابه مع الحالات التاريخية مرجع تحليلي وليس ضمانًا للنتائج المستقبلية.`;
}

function registerUserCommands(bot) {
  bot.command('status', (ctx) => {
    const user = findUser(ctx.from.id);
    if (!user) {
      return ctx.reply(isEnglish(ctx) ? 'Send /start first.' : 'اكتب /start أولاً');
    }
    return ctx.reply(accountText(ctx, user), keyboard(ctx));
  });

  bot.command('menu', (ctx) =>
    ctx.reply(
      isEnglish(ctx) ? '📋 Main menu:' : '📋 القائمة الرئيسية:',
      keyboard(ctx)
    )
  );

  bot.command('vip', (ctx) =>
    ctx.reply(
      `${isEnglish(ctx) ? 'Choose a VIP plan:' : 'اختر خطة VIP:'}\n\n${config.paymentInfo}`,
      vipKeyboard()
    )
  );

  bot.command('ref', (ctx) => {
    const user = findUser(ctx.from.id);
    if (!user) {
      return ctx.reply(isEnglish(ctx) ? 'Send /start first.' : 'اكتب /start أولاً');
    }
    const link = `https://t.me/${config.botUsername}?start=${user.referral_code}`;

    return ctx.reply(
      isEnglish(ctx)
        ? `🔗 Your referral link:\n${link}\n\n🎁 Points: ${user.points || 0}`
        : `🔗 رابط إحالتك:\n${link}\n\n🎁 نقاطك: ${user.points || 0}`,
      keyboard(ctx)
    );
  });

  bot.hears('🔎 Smart Scanner', async (ctx) => {
    try {
      await ctx.reply(
        isEnglish(ctx)
          ? '🔎 SMART MARKET SCANNER\n\n🔍 Scanning markets...\n🧠 Ranking opportunities...\n⏳ One moment.'
          : '🔎 الماسح الذكي للسوق\n\n🔍 جاري فحص الأسواق...\n🧠 ترتيب الفرص حسب القوة...\n⏳ لحظات.'
      );

      const results = await scanMarkets();

      if (!results || results.length === 0) {
        return ctx.reply(
          isEnglish(ctx)
            ? '🔍 No suitable market opportunities found right now.\n\nThe market remains under monitoring.'
            : '🔍 لا توجد فرص مناسبة حاليًا.\n\nالسوق ما زال تحت المراقبة.',
          keyboard(ctx)
        );
      }

      return ctx.reply(scannerResultText(ctx, results), keyboard(ctx));
    } catch (error) {
      console.log('❌ Smart Scanner error:', error.message);
      return ctx.reply(
        isEnglish(ctx)
          ? '❌ Smart Scanner could not complete the scan. Please try again shortly.'
          : '❌ تعذر إكمال فحص Smart Scanner. حاول مرة أخرى بعد قليل.',
        keyboard(ctx)
      );
    }
  });

  bot.hears('📈 تحليل', async (ctx) => {
    return ctx.reply(
      isEnglish(ctx)
        ? '📊 MARKET ANALYSIS\n\nChoose the asset you want to analyze:'
        : '📊 تحليل السوق\n\nاختر الأصل الذي تريد تحليله:',
      assetKeyboard(ctx)
    );
  });

  Object.entries(ASSET_MAP).forEach(([button, pair]) => {
    bot.hears(button, async (ctx) => {
      try {
        await ctx.reply(
          isEnglish(ctx)
            ? `🔎 Analyzing ${pair}...\n\n🧠 Reading trend, momentum and key levels.\n⏳ One moment.`
            : `🔎 جاري تحليل ${pair}...\n\n🧠 قراءة الاتجاه والزخم والمستويات المهمة.\n⏳ لحظات.`
        );

        const result = await analyzePair(pair);

        if (!result || !result.indicators) {
          return ctx.reply(
            isEnglish(ctx)
              ? `❌ ${pair} analysis is unavailable right now. Please try again shortly.`
              : `❌ تعذر الحصول على تحليل ${pair} حاليًا. حاول مرة أخرى بعد قليل.`,
            keyboard(ctx)
          );
        }

        return ctx.reply(marketAnalysisText(ctx, pair, result), keyboard(ctx));
      } catch (error) {
        console.log(`❌ Analysis error ${pair}:`, error.message);
        return ctx.reply(
          isEnglish(ctx)
            ? `❌ An error occurred while analyzing ${pair}. Please try again shortly.`
            : `❌ حدث خطأ أثناء تحليل ${pair}. حاول مرة أخرى بعد قليل.`,
          keyboard(ctx)
        );
      }
    });
  });

  bot.hears('⚡ صفقة الآن', async (ctx) => {
    try {
      await ctx.reply(
        isEnglish(ctx)
          ? `⚡ SEARCHING FOR A TRADE

🔍 Scanning markets
🧠 Analyzing trend and momentum
🤖 Applying AI filter
🧪 Checking historical setups
🛡️ Reviewing trade quality

⏳ One moment...`
          : `⚡ جاري البحث عن أفضل فرصة

🔍 فحص الأسواق
🧠 تحليل الاتجاه والزخم
🤖 تطبيق فلتر الذكاء الاصطناعي
🧪 مراجعة الحالات التاريخية
🛡️ تقييم جودة الصفقة

⏳ لحظات...`
      );

      const trade = await getBestTrade();

      if (!trade) {
        return ctx.reply(
          isEnglish(ctx)
            ? `🔍 No high-quality trade is available right now.

The current opportunities did not pass the bot's entry filters.

🟢 Market monitoring continues.`
            : `🔍 لا توجد صفقة قوية مناسبة حاليًا.

الفرص الحالية لم تتجاوز شروط الدخول الخاصة بالبوت.

🟢 السوق تحت المراقبة.`,
          keyboard(ctx)
        );
      }

      return ctx.reply(tradeText(ctx, trade), keyboard(ctx));
    } catch (error) {
      console.log('❌ Best Trade command error:', error.message);
      return ctx.reply(
        isEnglish(ctx)
          ? '❌ An error occurred while searching for a trade. Please try again shortly.'
          : '❌ حدث خطأ أثناء البحث عن أفضل صفقة. حاول مرة أخرى بعد قليل.',
        keyboard(ctx)
      );
    }
  });

  // Single Signal Lab handler — duplicate handler removed.
  bot.hears('🧪 AI Signal Lab', async (ctx) => {
    try {
      await ctx.reply(
        isEnglish(ctx)
          ? '🧪 AI SIGNAL LAB\n\n🔬 Scanning markets and comparable historical setups...\n⏳ One moment.'
          : '🧪 مختبر إشارات الذكاء الاصطناعي\n\n🔬 جاري فحص السوق والحالات التاريخية المشابهة...\n⏳ لحظات.'
      );

      const results = await calculateSignalLab();

      if (!results.length) {
        return ctx.reply(
          isEnglish(ctx)
            ? '❌ Signal Lab results are unavailable right now. Please try again shortly.'
            : '❌ تعذر الحصول على نتائج Signal Lab حاليًا. حاول مرة أخرى بعد قليل.',
          keyboard(ctx)
        );
      }

      return ctx.reply(signalLabText(ctx, results), keyboard(ctx));
    } catch (error) {
      console.log('❌ Signal Lab command error:', error.message);
      return ctx.reply(
        isEnglish(ctx)
          ? '❌ AI Signal Lab could not complete the analysis. Please try again.'
          : '❌ حدث خطأ أثناء تشغيل AI Signal Lab. حاول مرة أخرى.',
        keyboard(ctx)
      );
    }
  });

  bot.hears('💎 VIP', (ctx) =>
    ctx.reply(
      `${isEnglish(ctx) ? 'Choose a VIP plan:' : 'اختر خطة VIP:'}\n\n${config.paymentInfo}`,
      vipKeyboard()
    )
  );

  bot.hears('🔗 الإحالة', (ctx) => {
    const user = findUser(ctx.from.id);
    if (!user) {
      return ctx.reply(isEnglish(ctx) ? 'Send /start first.' : 'اكتب /start أولاً');
    }
    const link = `https://t.me/${config.botUsername}?start=${user.referral_code}`;
    return ctx.reply(
      isEnglish(ctx)
        ? `🔗 Your referral link:\n${link}\n\n🎁 Points: ${user.points || 0}`
        : `🔗 رابط إحالتك:\n${link}\n\n🎁 نقاطك: ${user.points || 0}`,
      keyboard(ctx)
    );
  });

bot.hears(['👤 حالة الحساب', '👤 حسابي', '👤 My Account'], (ctx) => {
  const user = findUser(ctx.from.id);

  if (!user) {
    return ctx.reply(
      isEnglish(ctx)
        ? '❌ Account not found. Send /start first.'
        : '❌ لم يتم العثور على حسابك. اكتب /start أولاً.'
    );
  }

  return ctx.reply(accountText(ctx, user), keyboard(ctx));
});
bot.hears(['🔔 التنبيهات', '🔔 Alerts'], (ctx) => {
  return ctx.reply(
    isEnglish(ctx)
      ? `🔔 ALERTS

Your market alerts section is ready.

Current status:
🟢 Trade opportunity alerts
🟢 Smart Scanner alerts
🟢 AI Signal alerts

More alert controls will be added soon.`
      : `🔔 التنبيهات

قسم تنبيهات السوق جاهز.

الحالة الحالية:
🟢 تنبيهات فرص التداول
🟢 تنبيهات Smart Scanner
🟢 تنبيهات إشارات AI

سيتم إضافة تحكم كامل في التنبيهات قريبًا.`,
    keyboard(ctx)
  );
});
  bot.hears('🎧 الدعم', (ctx) => {
    return ctx.reply(
      isEnglish(ctx)
        ? '📩 Technical support:\n@Axiomiexfx_support'
        : '📩 الدعم الفني:\n@Axiomiexfx_support',
      keyboard(ctx)
    );
  });

  // Kept for users who still have the old keyboard cached in Telegram.
  bot.hears('ℹ️ المساعدة', (ctx) =>
    ctx.reply(
      isEnglish(ctx)
        ? 'ℹ️ Help\n\n/menu Main menu\n/vip VIP\n/ref Referral\n/status Account'
        : 'ℹ️ المساعدة\n\n/menu القائمة الرئيسية\n/vip اشتراك VIP\n/ref الإحالة\n/status الحساب',
      keyboard(ctx)
    )
  );

  bot.hears('👥 الجروب الرئيسي', async (ctx) => {
    const link = process.env.MAIN_GROUP_LINK;

    if (!link) {
      return ctx.reply(
        isEnglish(ctx)
          ? '❌ Main group link is not configured right now.'
          : '❌ رابط الجروب غير مضبوط حاليًا.',
        keyboard(ctx)
      );
    }

    return ctx.reply(
      isEnglish(ctx)
        ? '👥 Main Group\n\nUse the button below to join:'
        : '👥 الجروب الرئيسي\n\nاضغط الزر للدخول إلى الجروب:',
      Markup.inlineKeyboard([
        [Markup.button.url(isEnglish(ctx) ? '🚀 Join Group' : '🚀 دخول الجروب', link)]
      ])
    );
  });

  Object.entries(plans).forEach(([key, plan]) => {
    bot.action(`vip_${key}`, async (ctx) => {
      createVipRequest(ctx.from.id, key);
      await ctx.answerCbQuery();

      return ctx.reply(
        isEnglish(ctx)
          ? `✅ Your ${plan.label} request has been recorded. Send the payment proof here and it will be forwarded to the admin.`
          : `✅ تم تسجيل طلب خطة ${plan.label}. أرسل إثبات الدفع هنا وسيصل للإدارة.`
      );
    });
  });

  bot.on(['photo', 'document'], async (ctx) => {
    console.log('📥 Payment proof received:', ctx.from.id);

    const fileId =
      ctx.message.photo?.at(-1)?.file_id ||
      ctx.message.document?.file_id;

    const caption = ctx.message.caption || '';

    createVipRequest(
      ctx.from.id,
      'manual',
      fileId,
      caption
    );

    const info = `📥 طلب اشتراك VIP جديد

👤 الاسم: ${ctx.from.first_name || ''}

🆔 ID: ${ctx.from.id}

👤 Username: @${ctx.from.username || 'لا يوجد'}

📝 ملاحظة:
${caption || 'لا يوجد'}`;

    for (const adminId of config.adminIds) {
      try {
        await ctx.telegram.sendMessage(adminId, info);
        await ctx.telegram.forwardMessage(
          adminId,
          ctx.chat.id,
          ctx.message.message_id
        );
      } catch (error) {
        console.log(`Forward to ${adminId} failed:`, error.message);
      }
    }

    return ctx.reply(
      isEnglish(ctx)
        ? '✅ Payment proof received and sent to the administration.'
        : '✅ تم استلام إثبات الدفع وإرساله للإدارة.',
      keyboard(ctx)
    );
  });
}

module.exports = registerUserCommands;
