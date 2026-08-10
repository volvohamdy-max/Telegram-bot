const config = require('../config');
const { findUser } = require('../database/users');
const { vipKeyboard, mainKeyboard } = require('../keyboards/main');
const { plans, createVipRequest } = require('../services/vipService');
const { analyzePair } = require('../services/analysisService');
const { scanMarkets } = require('../services/smartScanner');
const { formatSignal } = require('../utils/format');
const { getSignal, saveSignal } = require('../services/signalCache');
const { Markup } = require('telegraf');
const { runSignalLab } = require('../services/signalLab');
const { getBestTrade } = require('../services/bestTrade');

function registerUserCommands(bot) {
bot.command('status', (ctx) => {
  const user = findUser(ctx.from.id);

  if (!user) {
    return ctx.reply('اكتب /start أولاً');
  }
return ctx.reply(`👤 حالة الحساب

🆔 ID: ${ctx.from.id}

VIP: ${user.is_vip ? '✅ مفعل' : '❌ غير مفعل'}
النقاط: ${user.points || 0}
`);
});
  bot.command('menu', (ctx) => ctx.reply('اختر من القائمة:', mainKeyboard()));
  bot.command('vip', (ctx) => ctx.reply(`اختر خطة VIP:\n\n${config.paymentInfo}`, vipKeyboard()));
  bot.command('ref', (ctx) => {
    const user = findUser(ctx.from.id);
    const link = `https://t.me/${config.botUsername}?start=${user.referral_code}`;
    return ctx.reply(`رابط إحالتك:\n${link}\nنقاطك: ${user.points}`);
  });
const analysisAssets = [
    ['🥇 XAUUSD', '₿ BTCUSD'],
    ['🇪🇺 EURUSD', '🇬🇧 GBPUSD'],
    ['🇯🇵 USDJPY', '🇪🇺 EURJPY'],
    ['🇬🇧 GBPJPY', '🇨🇭 CHFJPY'],
    ['🔙 رجوع']
];


bot.hears('🔎 Smart Scanner', async (ctx) => {
    try {
        await ctx.reply(
            '🔎 SMART MARKET SCANNER\n\n' +
            '⏳ جاري فحص الأسواق...\n' +
            'قد يستغرق الأمر لحظات.'
        );

        const results = await scanMarkets();

        if (!results || results.length === 0) {
            return ctx.reply(
                '❌ لم يتم العثور على نتائج حاليًا.\n\n' +
                'حاول مرة أخرى بعد قليل.'
            );
        }

        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

        let message =
            '🔎 SMART MARKET SCANNER\n' +
            '━━━━━━━━━━━━━━━━━━\n\n';

        results.forEach((item, index) => {

            let directionEmoji = '🟡';

            if (item.action === 'BUY') {
                directionEmoji = '🟢';
            } else if (item.action === 'SELL') {
                directionEmoji = '🔴';
            }

            message +=
                `${medals[index]} ${item.score}/100 ` +
                `${item.pair} ` +
                `${directionEmoji} ${item.action}\n`;
        });

        message +=
            '\n━━━━━━━━━━━━━━━━━━\n' +
            `📊 تم تحليل ${8} أزواج\n` +
            '⏱️ آخر تحديث: الآن\n\n' +
            '⚠️ التحليل يعكس حالة السوق الحالية ' +
            'وليس ضمانًا للربح.';

        return ctx.reply(
            message,
            Markup.keyboard([
                ['📈 تحليل', '🔎 Smart Scanner'],
                ['💎 VIP', '🔗 الإحالة'],
                ['👤 حالة الحساب', 'ℹ️ المساعدة'],
                ['👥 الجروب الرئيسي', '🎧 الدعم']
            ]).resize()
        );

    } catch (error) {

        console.log(
            '❌ Smart Scanner error:',
            error.message
        );

        return ctx.reply(
            '❌ حدث خطأ أثناء تشغيل Smart Scanner.\n\n' +
            'حاول مرة أخرى بعد قليل.'
        );
    }
});
bot.hears('📈 تحليل', async (ctx) => {
    return ctx.reply(
        '📊 تحليل السوق\n\nاختر الأصل الذي تريد تحليله:',
        Markup.keyboard(analysisAssets).resize()
    );
});

const assetMap = {
    '🥇 XAUUSD': 'XAUUSD',
    '₿ BTCUSD': 'BTCUSD',
    '🇪🇺 EURUSD': 'EURUSD',
    '🇬🇧 GBPUSD': 'GBPUSD',
    '🇯🇵 USDJPY': 'USDJPY',
    '🇪🇺 EURJPY': 'EURJPY',
    '🇬🇧 GBPJPY': 'GBPJPY',
    '🇨🇭 CHFJPY': 'CHFJPY'
};

Object.entries(assetMap).forEach(([button, pair]) => {
bot.hears('🤖 Smart Scanner', async (ctx) => {
  try {
    await ctx.reply('🤖 Smart Market Scanner\n\n🔎 جاري فحص الأسواق...\n⏳ لحظات...');

    const { scanMarkets } = require('../services/smartScanner');

    const results = await scanMarkets();

    if (!results || results.length === 0) {
      return ctx.reply(
        '⚠️ لم يتم العثور على نتائج صالحة حاليًا.',
        mainKeyboard()
      );
    }

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

    const text = results.map((item, index) => {
      return `${medals[index]} ${item.score} ${item.pair} ${item.action}`;
    }).join('\n');

    return ctx.reply(
`🤖 SMART MARKET SCANNER

━━━━━━━━━━━━━━━━━━
${text}
━━━━━━━━━━━━━━━━━━

⏱️ الإطار: 15 دقيقة
📊 الترتيب حسب قوة الفرصة

⚠️ النتائج تحليلية وليست ضمانًا للربح.`,
Markup.keyboard([
    ['📈 تحليل'],
    ['💎 VIP', '🔗 الإحالة'],
    ['👤 حالة الحساب', 'ℹ️ المساعدة'],
    ['👥 الجروب الرئيسي', '🎧 الدعم']
]).resize()

    );

  } catch (error) {
    console.log('❌ Smart Scanner error:', error.message);

    return ctx.reply(
      '❌ حدث خطأ أثناء تشغيل Smart Scanner.\n\nحاول مرة أخرى.',
      mainKeyboard()
    );
  }
});
    bot.hears(button, async (ctx) => {

        try {

            await ctx.reply(
                `🔎 جاري تحليل ${pair}...\n\n⏳ لحظات...`
            );

            const result = await analyzePair(pair);

            if (!result || !result.indicators) {
                return ctx.reply(
                    `❌ تعذر الحصول على تحليل ${pair} حاليًا.\nحاول مرة أخرى بعد قليل.`
                );
            }

            const trend =
                result.indicators.ema20 > result.indicators.ema50
                    ? "🟢 صاعد"
                    : "🔴 هابط";

            const trendPower =
                result.indicators.adx >= 35
                    ? "⭐⭐⭐⭐⭐ (قوي جدًا)"
                    : result.indicators.adx >= 25
                    ? "⭐⭐⭐⭐☆ (قوي)"
                    : result.indicators.adx >= 20
                    ? "⭐⭐⭐☆☆ (متوسط)"
                    : "⭐⭐☆☆☆ (ضعيف)";

            const aiComment =
                result.signal && result.signal.analysis
                    ? result.signal.analysis
                    : `تشير المؤشرات الفنية إلى ${trend === "🟢 صاعد"
                        ? "سيطرة المشترين"
                        : "سيطرة البائعين"
                    } على حركة ${pair}.`;

            const trendScore =
                result.indicators.ema20 > result.indicators.ema50 ? 9 : 4;

            const momentumScore =
                result.indicators.rsi > 55 &&
                result.indicators.rsi < 70
                    ? 8
                    : 6;

            const buyersScore =
                result.indicators.macd.macd >
                result.indicators.macd.signal
                    ? 9
                    : 4;

            const liquidityScore =
                result.indicators.adx > 25 ? 8 : 6;

            const finalScore = Math.round(
                (
                    trendScore +
                    momentumScore +
                    buyersScore +
                    liquidityScore
                ) / 4 * 10
            );

            const price = Number(result.indicators.lastPrice);

            return ctx.reply(
`📊 MARKET ANALYSIS

🥇 الزوج:
${pair}

💰 السعر الحالي:
${Number.isFinite(price) ? price.toFixed(5) : result.indicators.lastPrice}

━━━━━━━━━━━━━━━━━━

📈 الاتجاه العام:
${trend}

📊 قوة الاتجاه:
${trendPower}

━━━━━━━━━━━━━━━━━━

📉 قراءة المؤشرات

✅ EMA20:
${result.indicators.ema20 > result.indicators.ema50
    ? "🟢 أعلى من EMA50"
    : "🔴 أقل من EMA50"
}

✅ RSI:
${result.indicators.rsi.toFixed(1)}
${result.indicators.rsi >= 50
    ? "🟢 الزخم إيجابي"
    : "🔴 الزخم سلبي"
}

✅ MACD:
${result.indicators.macd.macd > result.indicators.macd.signal
    ? "🟢 تقاطع شرائي مستمر"
    : "🔴 تقاطع بيعي مستمر"
}

✅ ADX:
${result.indicators.adx.toFixed(1)}
${result.indicators.adx >= 25
    ? "🟢 الترند قوي"
    : "🟡 الترند ضعيف"
}

━━━━━━━━━━━━━━━━━━

📍 أهم المستويات

🟢 الدعم:
${result.indicators.support}

🔴 المقاومة:
${result.indicators.resistance}

━━━━━━━━━━━━━━━━━━

🤖 تحليل الذكاء الاصطناعي

${aiComment}

━━━━━━━━━━━━━━━━━━

📌 تقييم السوق

🟢 الاتجاه:
${trendScore}/10

🟢 الزخم:
${momentumScore}/10

🟢 السيولة:
${liquidityScore}/10

🟢 قوة المشترين:
${buyersScore}/10

━━━━━━━━━━━━━━━━━━

⭐ التقييم النهائي:
${finalScore >= 70 ? "🟢" : "🟡"} ${finalScore}/100

⚠️ التقرير يوضح حالة السوق الحالية وليس إشارة دخول مباشرة.`,
mainKeyboard()
            );

        } catch (err) {

            console.log(
                `❌ Analysis error ${pair}:`,
                err.message
            );

            return ctx.reply(
                `❌ حصل خطأ أثناء تحليل ${pair}.\n\nحاول مرة أخرى بعد قليل.`
            );
        }
    });

});
bot.hears('⚡ صفقة الآن', async (ctx) => {
    try {
        await ctx.reply(
            '🎯 جاري البحث عن أفضل صفقة حاليًا...\n\n' +
            '🔎 فحص السوق\n' +
            '🧠 تحليل الذكاء الاصطناعي\n' +
            '🧪 اختبار Signal Lab\n\n' +
            '⏳ لحظات...'
        );

        const trade = await getBestTrade();

        if (!trade) {
            return ctx.reply(
                '⏳ لا توجد صفقة قوية حاليًا.\n\n' +
                'السوق تحت المراقبة 🔎\n' +
                'حاول مرة أخرى بعد قليل.',
                mainKeyboard()
            );
        }

        const indicators = trade.indicators || {};

        const price = Number(indicators.lastPrice);

        const entry = Number.isFinite(price)
            ? price
            : null;

        const atr = Number(indicators.atr);

        let tp1 = null;
        let tp2 = null;
        let sl = null;

        if (
            Number.isFinite(entry) &&
            Number.isFinite(atr) &&
            atr > 0
        ) {
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

        const formatPrice = (value) => {
            if (!Number.isFinite(Number(value))) {
                return 'غير متاح';
            }

            return Number(value).toFixed(5);
        };

        const actionEmoji =
            trade.action === 'BUY'
                ? '🟢 BUY'
                : '🔴 SELL';

        const strength =
            trade.finalScore >= 85
                ? '🔥 قوية جدًا'
                : trade.finalScore >= 75
                    ? '💪 قوية'
                    : '🟡 متوسطة';

        return ctx.reply(
            `⚡ صفقة الآن

🎯 ${trade.pair} ${actionEmoji}

⭐ Smart Score: ${trade.smartScore}/100
🤖 AI Confidence: ${trade.confidence}%
🧪 Historical Score: ${trade.historicalScore}/100
📚 Similar Setups: ${trade.similarSetups}

🎯 TP1 Success: ${trade.tp1Rate}%
🏆 TP2 Success: ${trade.tp2Rate}%
🛑 SL Rate: ${trade.slRate}%

━━━━━━━━━━━━━━━━━━

💰 Entry:
${formatPrice(entry)}

🎯 TP1:
${formatPrice(tp1)}

🏆 TP2:
${formatPrice(tp2)}

🛑 SL:
${formatPrice(sl)}

━━━━━━━━━━━━━━━━━━

🔥 قوة الصفقة:
${strength}

📊 RSI:
${Number.isFinite(Number(indicators.rsi))
    ? Number(indicators.rsi).toFixed(1)
    : 'غير متاح'}

💪 ADX:
${Number.isFinite(Number(indicators.adx))
    ? Number(indicators.adx).toFixed(1)
    : 'غير متاح'}

━━━━━━━━━━━━━━━━━━

⚠️ الصفقة مبنية على التحليل الفني والذكاء الاصطناعي والحالات التاريخية، وليست ضمانًا للربح.`,
            mainKeyboard()
        );

    } catch (error) {
        console.log(
            '❌ Best Trade command error:',
            error.message
        );

        return ctx.reply(
            '❌ حصل خطأ أثناء البحث عن أفضل صفقة.\n\n' +
            'حاول مرة أخرى بعد قليل.',
            mainKeyboard()
        );
    }
});
// ==========================================
// 🧪 AI SIGNAL LAB
// ==========================================
bot.hears('🧪 AI Signal Lab', async (ctx) => {
    try {
        await ctx.reply(
            '🧪 AI SIGNAL LAB\n\n🔬 جاري فحص السوق والحالات التاريخية...\n⏳ لحظات...'
        );

        const pairs = [
            'XAUUSD',
            'BTCUSD',
            'EURUSD',
            'GBPUSD',
            'USDJPY',
            'EURJPY',
            'GBPJPY',
            'CHFJPY'
        ];

        const results = [];

        for (const pair of pairs) {
            try {
                console.log(`🧪 Running Signal Lab for ${pair}...`);

                const analysis = await analyzePair(pair);

                if (!analysis || !analysis.indicators) {
                    console.log(`⚠️ No analysis for ${pair}`);
                    continue;
                }

                const indicators = analysis.indicators;

                const ema20 = Number(indicators.ema20);
                const ema50 = Number(indicators.ema50);
                const rsi = Number(indicators.rsi);
                const adx = Number(indicators.adx);

                let buyScore = 0;
                let sellScore = 0;

                // EMA
                if (
                    Number.isFinite(ema20) &&
                    Number.isFinite(ema50)
                ) {
                    if (ema20 > ema50) {
                        buyScore++;
                    } else if (ema20 < ema50) {
                        sellScore++;
                    }
                }

                // RSI
                if (Number.isFinite(rsi)) {
                    if (rsi > 50) {
                        buyScore++;
                    } else if (rsi < 50) {
                        sellScore++;
                    }
                }

                // MACD
                if (
                    indicators.macd &&
                    Number.isFinite(Number(indicators.macd.macd)) &&
                    Number.isFinite(Number(indicators.macd.signal))
                ) {
                    if (
                        Number(indicators.macd.macd) >
                        Number(indicators.macd.signal)
                    ) {
                        buyScore++;
                    } else if (
                        Number(indicators.macd.macd) <
                        Number(indicators.macd.signal)
                    ) {
                        sellScore++;
                    }
                }

                // ADX
                if (Number.isFinite(adx) && adx >= 20) {
                    if (buyScore > sellScore) {
                        buyScore++;
                    } else if (sellScore > buyScore) {
                        sellScore++;
                    }
                }

                let direction = 'WAIT';

                if (buyScore > sellScore && buyScore >= 2) {
                    direction = 'BUY';
                } else if (
                    sellScore > buyScore &&
                    sellScore >= 2
                ) {
                    direction = 'SELL';
                }

                const smartScore = Math.round(
                    (Math.max(buyScore, sellScore) / 4) * 100
                );

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
                        const labResult = await runSignalLab(
                            pair,
                            indicators,
                            direction
                        );

                        if (labResult) {
                            lab = {
                                approved: Boolean(labResult.approved),
                                historicalScore:
                                    Number(labResult.historicalScore) || 0,
                                similarSetups:
                                    Number(labResult.similarSetups) || 0,
                                tp1Rate:
                                    Number(labResult.tp1Rate) || 0,
                                tp2Rate:
                                    Number(labResult.tp2Rate) || 0,
                                slRate:
                                    Number(labResult.slRate) || 0
                            };
                        }
                    } catch (error) {
                        console.log(
                            `❌ Lab calculation ${pair}:`,
                            error.message
                        );
                    }
                }

                results.push({
                    pair,
                    direction,
                    smartScore,
                    historicalScore: lab.historicalScore,
                    similarSetups: lab.similarSetups,
                    tp1Rate: lab.tp1Rate,
                    tp2Rate: lab.tp2Rate,
                    slRate: lab.slRate,
                    approved: lab.approved
                });

            } catch (error) {
                console.log(
                    `❌ Signal Lab ${pair} error:`,
                    error.message
                );
            }
        }

        if (!results.length) {
            return ctx.reply(
                '❌ تعذر الحصول على نتائج Signal Lab حاليًا.\n\nحاول مرة أخرى بعد قليل.',
                mainKeyboard()
            );
        }

        results.sort(
            (a, b) => b.smartScore - a.smartScore
        );

        const medals = [
            '🥇',
            '🥈',
            '🥉',
            '4️⃣',
            '5️⃣'
        ];

        const topResults = results.slice(0, 5);

        const messages = topResults.map((item, index) => {
            const direction =
                item.direction === 'BUY'
                    ? '🟢 BUY'
                    : item.direction === 'SELL'
                        ? '🔴 SELL'
                        : '⚪ WAIT';

            const status = item.approved
                ? '✅ LAB APPROVED'
                : '⚠️ LAB NOT APPROVED';

            return `${medals[index]} ${item.pair} ${direction}
⭐ Smart Score: ${item.smartScore}/100
🧪 Historical Score: ${item.historicalScore}/100
📚 Similar Setups: ${item.similarSetups}
🎯 TP1 Success: ${item.tp1Rate}%
🏆 TP2 Success: ${item.tp2Rate}%
🛑 SL Rate: ${item.slRate}%
${status}`;
        });

        const report = `🧪 AI SIGNAL LAB

${messages.join('\n━━━━━━━━━━━━━━━━━━\n\n')}

━━━━━━━━━━━━━━━━━━

📌 Signal Lab يعتمد على حالات تاريخية مشابهة، وليس ضمانًا للنتيجة المستقبلية.`;

        return ctx.reply(
            report,
            mainKeyboard()
        );

    } catch (error) {
        console.log(
            '❌ Signal Lab command error:',
            error.message
        );

        return ctx.reply(
            '❌ حصل خطأ أثناء تشغيل AI Signal Lab.\n\nحاول مرة أخرى.',
            mainKeyboard()
        );
    }
});

bot.hears('🧪 AI Signal Lab', async (ctx) => {
    try {
        await ctx.reply(
            '🧪 AI SIGNAL LAB\n\n🔬 جاري فحص السوق والحالات التاريخية...\n⏳ لحظات...'
        );

        const pairs = [
            'XAUUSD',
            'BTCUSD',
            'EURUSD',
            'GBPUSD',
            'USDJPY',
            'EURJPY',
            'GBPJPY',
            'CHFJPY'
        ];

        const results = [];

        for (const pair of pairs) {
            try {
                console.log(`🧪 Running Signal Lab for ${pair}...`);

                const analysis = await analyzePair(pair);

                if (!analysis || !analysis.indicators) {
                    console.log(`⚠️ No analysis for ${pair}`);
                    continue;
                }

                const indicators = analysis.indicators;

                const ema20 = Number(indicators.ema20);
                const ema50 = Number(indicators.ema50);
                const rsi = Number(indicators.rsi);
                const adx = Number(indicators.adx);

                let buyScore = 0;
                let sellScore = 0;

                // EMA
                if (
                    Number.isFinite(ema20) &&
                    Number.isFinite(ema50)
                ) {
                    if (ema20 > ema50) {
                        buyScore++;
                    } else if (ema20 < ema50) {
                        sellScore++;
                    }
                }

                // RSI
                if (Number.isFinite(rsi)) {
                    if (rsi > 50) {
                        buyScore++;
                    } else if (rsi < 50) {
                        sellScore++;
                    }
                }

                // MACD
                if (
                    indicators.macd &&
                    Number.isFinite(Number(indicators.macd.macd)) &&
                    Number.isFinite(Number(indicators.macd.signal))
                ) {
                    if (
                        Number(indicators.macd.macd) >
                        Number(indicators.macd.signal)
                    ) {
                        buyScore++;
                    } else if (
                        Number(indicators.macd.macd) <
                        Number(indicators.macd.signal)
                    ) {
                        sellScore++;
                    }
                }

                // ADX
                if (Number.isFinite(adx) && adx >= 20) {
                    if (buyScore > sellScore) {
                        buyScore++;
                    } else if (sellScore > buyScore) {
                        sellScore++;
                    }
                }

                let direction = 'WAIT';

                if (buyScore > sellScore && buyScore >= 2) {
                    direction = 'BUY';
                } else if (
                    sellScore > buyScore &&
                    sellScore >= 2
                ) {
                    direction = 'SELL';
                }

                const smartScore = Math.round(
                    (Math.max(buyScore, sellScore) / 4) * 100
                );

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
                        const labResult = await runSignalLab(
                            pair,
                            indicators,
                            direction
                        );

                        if (labResult) {
                            lab = {
                                approved: Boolean(labResult.approved),
                                historicalScore:
                                    Number(labResult.historicalScore) || 0,
                                similarSetups:
                                    Number(labResult.similarSetups) || 0,
                                tp1Rate:
                                    Number(labResult.tp1Rate) || 0,
                                tp2Rate:
                                    Number(labResult.tp2Rate) || 0,
                                slRate:
                                    Number(labResult.slRate) || 0
                            };
                        }
                    } catch (error) {
                        console.log(
                            `❌ Lab calculation ${pair}:`,
                            error.message
                        );
                    }
                }

                results.push({
                    pair,
                    direction,
                    smartScore,
                    historicalScore: lab.historicalScore,
                    similarSetups: lab.similarSetups,
                    tp1Rate: lab.tp1Rate,
                    tp2Rate: lab.tp2Rate,
                    slRate: lab.slRate,
                    approved: lab.approved
                });

            } catch (error) {
                console.log(
                    `❌ Signal Lab ${pair} error:`,
                    error.message
                );
            }
        }

        if (!results.length) {
            return ctx.reply(
                '❌ تعذر الحصول على نتائج Signal Lab حاليًا.\n\nحاول مرة أخرى بعد قليل.',
                mainKeyboard()
            );
        }

        results.sort(
            (a, b) => b.smartScore - a.smartScore
        );

        const medals = [
            '🥇',
            '🥈',
            '🥉',
            '4️⃣',
            '5️⃣'
        ];

        const topResults = results.slice(0, 5);

        const messages = topResults.map((item, index) => {
            const direction =
                item.direction === 'BUY'
                    ? '🟢 BUY'
                    : item.direction === 'SELL'
                        ? '🔴 SELL'
                        : '⚪ WAIT';

            const status = item.approved
                ? '✅ LAB APPROVED'
                : '⚠️ LAB NOT APPROVED';

            return `${medals[index]} ${item.pair} ${direction}
⭐ Smart Score: ${item.smartScore}/100
🧪 Historical Score: ${item.historicalScore}/100
📚 Similar Setups: ${item.similarSetups}
🎯 TP1 Success: ${item.tp1Rate}%
🏆 TP2 Success: ${item.tp2Rate}%
🛑 SL Rate: ${item.slRate}%
${status}`;
        });

        const report = `🧪 AI SIGNAL LAB

${messages.join('\n━━━━━━━━━━━━━━━━━━\n\n')}

━━━━━━━━━━━━━━━━━━

📌 Signal Lab يعتمد على حالات تاريخية مشابهة، وليس ضمانًا للنتيجة المستقبلية.`;

        return ctx.reply(
            report,
            mainKeyboard()
        );

    } catch (error) {
        console.log(
            '❌ Signal Lab command error:',
            error.message
        );

        return ctx.reply(
            '❌ حصل خطأ أثناء تشغيل AI Signal Lab.\n\nحاول مرة أخرى.',
            mainKeyboard()
        );
    }
});
  bot.hears('💎 VIP', (ctx) => ctx.reply(`اختر خطة VIP:\n\n${config.paymentInfo}`, vipKeyboard()));
  bot.hears('🔗 الإحالة', (ctx) => ctx.telegram.sendMessage(ctx.chat.id, '/ref'));
bot.hears('ℹ️ المساعدة', (ctx) =>
  ctx.reply(
    'الأوامر:\n/menu\n/vip\n/ref\n\n🥇 اضغط زر 📈 تحليل لتحليل الذهب'
  )
);
bot.hears('👤 حالة الحساب', (ctx) => {

    const user = findUser(ctx.from.id);

    if (!user) {
        return ctx.reply('❌ لم يتم العثور على حسابك.\nاكتب /start أولاً.');
    }

    return ctx.reply(
`👤 حالة الحساب

🆔 ID
${ctx.from.id}

💎 اشتراك VIP
${user.is_vip ? "✅ مفعل" : "❌ غير مفعل"}

🎁 النقاط
${user.points || 0}

📅 انتهاء الاشتراك
${user.vip_expire || "غير مشترك"}

🔗 كود الإحالة
${user.referral_code || "-"}`
    );

});
bot.hears('🎧 الدعم', (ctx) => {
  return ctx.reply(
    '📩 الدعم الفني:\n@Axiomiexfx_support'
  );
});
bot.hears('👥 الجروب الرئيسي', async (ctx) => {
    const link = process.env.MAIN_GROUP_LINK;

    if (!link) {
        return ctx.reply('❌ رابط الجروب غير مضبوط حاليًا.');
    }

    await ctx.reply(
        '👥 الجروب الرئيسي\n\nاضغط الزر للدخول إلى الجروب:',
        Markup.inlineKeyboard([
            [Markup.button.url('🚀 دخول الجروب', link)]
        ])
    );
});
bot.hears('🔙 رجوع', async (ctx) => {
    return ctx.reply(
        '📋 القائمة الرئيسية:',
        mainKeyboard()
    );
});

  Object.entries(plans).forEach(([key, plan]) => {
    bot.action(`vip_${key}`, async (ctx) => {
      createVipRequest(ctx.from.id, key);
      await ctx.answerCbQuery();
      return ctx.reply(`تم تسجيل طلب خطة ${plan.label}. أرسل إثبات الدفع هنا وسيصل للأدمن.`);
    });
  });


bot.on(['photo', 'document'], async (ctx) => {

  console.log("📥 Payment proof received:", ctx.from.id);

  const fileId =
    ctx.message.photo?.at(-1)?.file_id ||
    ctx.message.document?.file_id;

  const caption = ctx.message.caption || "";

  createVipRequest(
    ctx.from.id,
    "manual",
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

    } catch (e) {
      console.log(`Forward to ${adminId} failed:`, e.message);
    }

  }

  return ctx.reply("✅ تم استلام إثبات الدفع وإرساله للإدارة.");

});
}

module.exports = registerUserCommands;
